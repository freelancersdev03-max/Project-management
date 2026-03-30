from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Client, ExternalTeam
from django.db import transaction, IntegrityError
from rest_framework.exceptions import ValidationError
import uuid

User = get_user_model()

# ---------------- Client ---------------- #
class ClientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Client
        fields = [
            "username", "email", "password",
            "company_name", "logo", "contact_email",
            "phone", "website", "address", "status",
            "employees", "assigned_sgms", "internal_team", "client_hierarchy"
        ]

    employees = serializers.SerializerMethodField()

    def get_employees(self, obj):
        members = obj.external_members.all()
        data = []
        for m in members:
            # Try to find an active project assignment
            # This follows the ExternalTeam -> User -> Projects (m2m) path
            assigned_project = m.user.projects.filter(status="ACTIVE").first()
            project_name = assigned_project.name if assigned_project else "Not Assigned"
            
            data.append({
                "id": m.user.id,
                "name": f"{m.user.first_name} {m.user.last_name}".strip() or m.user.username,
                "shortform": m.user.shortform,
                "email": m.user.email,
                "role": m.user.role if m.user.role != "EXTERNAL" else "Client Team", 
                "status": m.status,   # Active/Inactive from ExternalTeam
                "project": project_name
            })
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        # Include login identifiers in detail payloads for admin edit forms.
        ret["username"] = instance.user.username
        ret["email"] = instance.user.email
        
        # Helper to format user
        def format_user(user):
            if not user: return None
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "shortform": user.shortform,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.username
            }

        ret['assigned_sgms_details'] = [format_user(u) for u in instance.assigned_sgms.all()]
        
        # Aggregate internal team members:
        # 1. Members directly in instance.internal_team
        # 2. Members assigned to any of the client's projects
        internal_users = set(instance.internal_team.all())
        
        # Import here to avoid circular dependency if any
        from projects.models import Project
        from sgm.models import ProjectTeam
        
        projects = Project.objects.filter(client=instance)
        for proj in projects:
            # Add members from Project.assigned_employees
            for emp in proj.assigned_employees.all():
                internal_users.add(emp.user)
            
            # Add members from ProjectTeam (legacy if still used)
            pt = ProjectTeam.objects.filter(project=proj).first()
            if pt:
                for member in pt.internal_members.all():
                    internal_users.add(member)

        # Sort members by full_name/username for consistency
        sorted_members = sorted(
            list(internal_users),
            key=lambda u: (u.first_name or "", u.last_name or "", u.username or "")
        )
        
        ret['internal_team_details'] = [format_user(u) for u in sorted_members]
        
        # NEW: Add seniors_details - seniors that are assigned to this client
        seniors = [
            format_user(et.user) for et in instance.external_members.filter(user__role="SENIOR")
        ]
        ret['seniors_details'] = seniors
        
        return ret

    def _extract_relation_ids(self, request, field_name, treat_missing_as_empty=False):
        """
        Normalize relation IDs from request payloads (multipart or JSON).
        For PUT requests we treat a missing field as an empty list so team removals
        are persisted when the client submits no values for that relation.
        """
        if not request:
            return None

        data = request.data

        if hasattr(data, "getlist"):
            if not treat_missing_as_empty and field_name not in data:
                return None
            raw_values = data.getlist(field_name)
        else:
            if field_name not in data:
                return [] if treat_missing_as_empty else None
            raw_values = data.get(field_name)
            if not isinstance(raw_values, list):
                raw_values = [raw_values]

        parsed_ids = []
        for value in raw_values:
            if value in (None, "", "null"):
                continue
            try:
                parsed_ids.append(int(value))
            except (TypeError, ValueError):
                continue

        return parsed_ids

    def create(self, validated_data):
        request = self.context.get("request")
        raw_username = validated_data.pop("username")
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        
        # Extract new fields
        assigned_sgms = validated_data.pop("assigned_sgms", [])
        internal_team = validated_data.pop("internal_team", [])

        unique_username = f"{raw_username}_{uuid.uuid4().hex[:6]}"

        with transaction.atomic():
            user = User.objects.create_user(
                username=unique_username,
                email=email,
                password=password,
                role="CLIENT"   # ✅ Assign role
            )
            creator = request.user if request and request.user.is_authenticated else None
            client = Client.objects.create(
                user=user,
                created_by=creator,
                **validated_data
            )

            # Persist explicit team selections (including empty lists on create).
            client.assigned_sgms.set(assigned_sgms)
            client.internal_team.set(internal_team)

        return client

    def update(self, instance, validated_data):
        request = self.context.get("request")

        # Optional user credential updates from edit modal.
        new_username = validated_data.pop("username", None)
        new_email = validated_data.pop("email", None)
        new_password = validated_data.pop("password", None)

        assigned_sgms = validated_data.pop("assigned_sgms", serializers.empty)
        internal_team = validated_data.pop("internal_team", serializers.empty)

        with transaction.atomic():
            client = super().update(instance, validated_data)

            user = client.user
            user_dirty = False

            if new_username:
                user.username = new_username
                user_dirty = True

            if new_email:
                normalized_email = new_email.strip().lower()
                if User.objects.filter(email=normalized_email).exclude(pk=user.pk).exists():
                    raise serializers.ValidationError({"email": "A user with this email already exists."})
                user.email = normalized_email
                user_dirty = True

            if new_password:
                user.set_password(new_password)
                user_dirty = True

            if user_dirty:
                try:
                    user.save()
                except IntegrityError:
                    raise serializers.ValidationError({"email": "A user with this email already exists."})

            force_full_replace = bool(request and request.method == "PUT")

            assigned_sgm_ids = self._extract_relation_ids(
                request,
                "assigned_sgms",
                treat_missing_as_empty=force_full_replace,
            )
            internal_team_ids = self._extract_relation_ids(
                request,
                "internal_team",
                treat_missing_as_empty=force_full_replace,
            )

            if assigned_sgm_ids is not None:
                sgm_users = User.objects.filter(id__in=assigned_sgm_ids, role="SGM")
                client.assigned_sgms.set(sgm_users)
            elif assigned_sgms is not serializers.empty:
                client.assigned_sgms.set(assigned_sgms)

            if internal_team_ids is not None:
                employee_users = User.objects.filter(id__in=internal_team_ids, role="EMPLOYEE")
                client.internal_team.set(employee_users)
            elif internal_team is not serializers.empty:
                client.internal_team.set(internal_team)

        return client

class ClientListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    project_count = serializers.IntegerField(read_only=True)
    assigned_sgms_details = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id", "company_name", "username", "email",
            "contact_email", "phone", "website", "address",
            "logo", "status", "created_at", "project_count",
            "assigned_sgms_details"
        ]

    def get_assigned_sgms_details(self, obj):
        return [
            {
                "id": u.id,
                "full_name": f"{u.first_name} {u.last_name}".strip() or u.username,
                "shortform": u.shortform,
                "email": u.email
            }
            for u in obj.assigned_sgms.all()
        ]

# ---------------- External Team ---------------- #
class ExternalMemberCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["EXTERNAL", "SENIOR"],
        required=False,
        default="EXTERNAL"
    )

    def create(self, validated_data):
        client = self.context["client"]
        email = validated_data["email"].lower().strip()
        raw_username = validated_data["username"]
        password = validated_data["password"]
        role = validated_data.get("role", "EXTERNAL")

        # 1. Check if User exists by email
        user = User.objects.filter(email=email).first()

        if not user:
             # 2. Create new user. Ensure username is unique and valid.
            from django.utils.text import slugify
            base_username = slugify(raw_username) or "user"
            unique_username = base_username
            
            # Uniquify if taken
            while User.objects.filter(username=unique_username).exists():
                unique_username = f"{base_username}_{uuid.uuid4().hex[:4]}"

            # Split name into first/last
            names = raw_username.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ""

            user = User.objects.create_user(
                username=unique_username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role
            )

        if ExternalTeam.objects.filter(user=user, client_org=client).exists():
            raise ValidationError("User already added to this client")

        external = ExternalTeam.objects.create(
            user=user,
            client_org=client,
            # role stored in user.role, not on ExternalTeam model
            created_by=self.context.get("creator")  # optional
        )

        if user.role == "SENIOR":
            # Senior should be available in every project under this client.
            from projects.models import Project
            for project in Project.objects.filter(client=client):
                project.external_team.add(user)

        return external

class ExternalTeamSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["EXTERNAL", "SENIOR"],
        write_only=True,
        required=False,
        default="EXTERNAL"
    )
    # New Fields
    status = serializers.ChoiceField(choices=[("active", "Active"), ("hold", "Hold"), ("inactive", "Inactive")], required=False, default="active")
    credential_access = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = ExternalTeam
        fields = ["id", "client_org", "role", "username", "email", "password", "status", "credential_access"]
        extra_kwargs = {
            "client_org": {"read_only": True}
        }

    def create(self, validated_data):
        username = validated_data.pop("username")
        email = validated_data.pop("email").lower().strip()
        password = validated_data.pop("password")
        role = validated_data.pop("role", "EXTERNAL")
        
        # External members created via this serializer (usually by SGM/Admin) 
        # should default to inactive until credential permission is granted.
        #However, if credential_access is explicitly True, then user should be active.
        credential_access = validated_data.get("credential_access", False)
        is_active = credential_access # If credential access is False, user is inactive.
        
        # Override is_active to False initially if no credential access
        # But if user serves other roles (which is unlikely for 'EXTERNAL'), we might need care.
        # For now, assuming new EXTERNAL user.

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username, 
                "role": role,
                "is_active": is_active
            }
        )
        
        if created:
            user.set_password(password)
            user.save()
        else:
            # If user exists, we might need to update their active status based on this new team adding them?
            # Plan says: "Newly created users are inactive... until SGM explicitly grants..."
            # If user already exists, we probably shouldn't deactivate them if they are active elsewhere.
            # But here we are just linking.
            pass

        # Check if already linked
        if ExternalTeam.objects.filter(client_org=validated_data.get('client_org'), user=user).exists():
             raise serializers.ValidationError(f"User {email} is already a member of this client.")

        external = ExternalTeam.objects.create(
            user=user,
            # role removed as it is not on ExternalTeam model
            **validated_data
        )

        if user.role == "SENIOR":
            # Keep Senior synced across all existing projects for this client.
            from projects.models import Project
            client = external.client_org
            for project in Project.objects.filter(client=client):
                project.external_team.add(user)

        return external
    
    

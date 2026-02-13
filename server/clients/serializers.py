from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Client, ExternalTeam
from django.db import transaction
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
            "employees", "assigned_sgms", "internal_team"
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
                "email": m.user.email,
                "role": m.user.role if m.user.role != "EXTERNAL" else "Client Team", 
                "status": m.status,   # Active/Inactive from ExternalTeam
                "project": project_name
            })
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        
        # Helper to format user
        def format_user(user):
            if not user: return None
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.username
            }

        ret['assigned_sgms_details'] = [format_user(u) for u in instance.assigned_sgms.all()]
        ret['internal_team_details'] = [format_user(u) for u in instance.internal_team.all()]
        return ret

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
            
            # ✅ Save SGMs (Many-to-Many)
            if assigned_sgms:
                client.assigned_sgms.set(assigned_sgms)
            
            # ✅ Save Internal Team (Many-to-Many)
            if internal_team:
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
                "email": u.email
            }
            for u in obj.assigned_sgms.all()
        ]

# ---------------- External Team ---------------- #
class ExternalMemberCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        client = self.context["client"]
        email = validated_data["email"].lower().strip()
        raw_username = validated_data["username"]
        password = validated_data["password"]

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
                role="EXTERNAL"
            )

        if ExternalTeam.objects.filter(user=user, client_org=client).exists():
            raise ValidationError("User already added to this client")

        external = ExternalTeam.objects.create(
            user=user,
            client_org=client,
            # role="EXTERNAL",
            created_by=self.context.get("creator")  # optional
        )
        return external

class ExternalTeamSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True, required=False, default="EXTERNAL")
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
        return external
    
    

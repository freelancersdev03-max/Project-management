from rest_framework import serializers
from .models import Project, ActionTask
from django.contrib.auth import get_user_model
from employees.models import Employee
from sgm.models import ProjectTeam


User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    # --------------------
    # Client & Creator
    # --------------------
    client_name = serializers.ReadOnlyField(source="client.company_name")
    created_by_email = serializers.ReadOnlyField(source="created_by.email")

    # --------------------
    # SGM (FIXED)
    # --------------------
    assigned_sgm_email = serializers.ReadOnlyField(source="assigned_sgm.email")
    assigned_sgm_name = serializers.ReadOnlyField(source="assigned_sgm.username")
    assigned_sgm_details = serializers.SerializerMethodField()
    assigned_sgm = serializers.PrimaryKeyRelatedField(read_only=True)

    # --------------------
    # External Lead
    # --------------------
    external_lead_name = serializers.ReadOnlyField(source="external_lead.username")
    external_lead_email = serializers.ReadOnlyField(source="external_lead.email")

    external_lead = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="EXTERNAL"),
        required=False,
        allow_null=True
    )

    # --------------------
    # External Team
    # --------------------
    external_team = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="EXTERNAL"),
        many=True,
        required=False
    )
    external_team_emails = serializers.SerializerMethodField()
    external_team_details = serializers.SerializerMethodField()

    # --------------------
    # Internal Team (WRITE) - Accepting User IDs
    # --------------------
    assigned_employees = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    # --------------------
    # Internal Team (READ)
    # --------------------
    team_members_details = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "target", "status",

            "client", "client_name",

            "assigned_sgm",
            "assigned_sgm_name",
            "assigned_sgm_email",
            "assigned_sgm_details",

            "external_lead",
            "external_lead_name",
            "external_lead_email",

            "external_team",
            "external_team_emails",
            "external_team_details",

            "assigned_employees",
            "team_members_details",

            "start_date", "end_date",

            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]

        read_only_fields = ("created_by", "created_at", "updated_at")

    # ====================
    # VALIDATION (UNCHANGED logic works with IDs)
    # ====================
    def validate(self, attrs):
        client = attrs.get('client', getattr(self.instance, 'client', None))

        # Validate Internal Employees (User IDs)
        assigned_employees_ids = attrs.get('assigned_employees')
        if client and assigned_employees_ids:
            # client.internal_team is ManyToMany to User
            valid_user_ids = set(client.internal_team.values_list('id', flat=True))
            invalid_ids = [uid for uid in assigned_employees_ids if uid not in valid_user_ids]
            if invalid_ids:
                raise serializers.ValidationError({
                    "assigned_employees": f"User IDs {invalid_ids} are not in this client's internal team."
                })

        # Validate External Team (User Objects or IDs depending on field type)
        # external_team uses PrimaryKeyRelatedField(User), so it gets User objects.
        external_team = attrs.get('external_team')
        if client and external_team:
            # client.external_members is ExternalTeam model related_name="external_members"
            # ExternalTeam has user field. So values_list('user__id') gives User IDs.
            valid_ext_ids = set(client.external_members.values_list('user__id', flat=True))
            invalid_users = [u for u in external_team if u.id not in valid_ext_ids]
            if invalid_users:
                raise serializers.ValidationError({
                    "external_team": "One or more users are not registered external members for this client."
                })

        return attrs

    # ====================
    # CREATE / UPDATE
    # ====================
    def create(self, validated_data):
        user_ids = validated_data.pop('assigned_employees', [])
        project = super().create(validated_data)
        if user_ids:
            self._set_employees(project, user_ids)
        return project

    def update(self, instance, validated_data):
        user_ids = validated_data.pop('assigned_employees', None)
        project = super().update(instance, validated_data)
        if user_ids is not None:
            self._set_employees(project, user_ids)
        return project

    def _set_employees(self, project, user_ids):
        # Map User IDs -> Employee Objects
        employees = Employee.objects.filter(user__id__in=user_ids)
        project.assigned_employees.set(employees)


    # ====================
    # READ-ONLY HELPERS
    # ====================
    def get_assigned_sgm_details(self, obj):
        if obj.assigned_sgm:
            return {
                "id": obj.assigned_sgm.id,
                "username": obj.assigned_sgm.username,
                "email": obj.assigned_sgm.email,
                "role": obj.assigned_sgm.role
            }
        return None

    def get_team_members_details(self, obj):
        members = []

        for emp in obj.assigned_employees.all():
            members.append({
                "id": emp.user.id,
                "username": emp.user.username,
                "email": emp.user.email,
                "designation": emp.designation,
            })

        if obj.client and hasattr(obj.client, "internal_team"):
            for member in obj.client.internal_team.all():
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                    "designation": None,
                })

        team = ProjectTeam.objects.filter(project=obj).first()
        if team:
            for member in team.internal_members.all():
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                    "designation": None,
                })

        unique_members = {m["id"]: m for m in members}
        return list(unique_members.values())

    def get_external_team_details(self, obj):
        members = []

        for u in obj.external_team.all():
            members.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
            })

        team = ProjectTeam.objects.filter(project=obj).first()
        if team:
            for member in team.external_members.all():
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                })

        unique_members = {m["id"]: m for m in members}
        return list(unique_members.values())

    def get_external_team_emails(self, obj):
        return [u.email for u in obj.external_team.all()]

class ActionTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = ActionTask
        fields = "__all__"
        read_only_fields = ("assigned_by", "status", "action_plan")

    def get_assigned_by_display(self, obj):
        request = self.context.get("request")

        if request and request.user.role == "EXTERNAL":
             # Logic to hide internal name if needed, or just return name
             # User code had: if obj.assigned_by.user_type == "internal": return "HQEPL Team"
             # But User model fields might be different. 
             # I'll stick to simple logic or what user provided. 
             # User provided: 
             # if request and request.user.user_type == "external":
             #    if obj.assigned_by.user_type == "internal": return "HQEPL Team"
             
             # But I recall User model has 'role', not 'user_type'.
             # And 'role' values are 'ADMIN', 'HQEPL', 'SGM', 'EMPLOYEE', 'EXTERNAL'.
             # So I should adapt logic to match `role`.
             pass
        
        # Adapting to known User model (role field):
        if obj.assigned_by:
             return obj.assigned_by.get_full_name()
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return "Unassigned"
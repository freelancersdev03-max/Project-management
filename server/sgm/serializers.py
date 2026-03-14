from rest_framework import serializers
from .models import ProjectTeam
from projects.models import Project
from clients.models import Client
from django.contrib.auth import get_user_model

User = get_user_model()

# -----------------------------
# Client Serializer (for /clients/)
# -----------------------------
class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            "id",
            "company_name",
            "contact_email",
            "phone",
            "website",
            "address"
        ]


# -----------------------------
# Project Serializer (includes client)
# -----------------------------
# -----------------------------
# Project Serializer (includes client)
# -----------------------------
class ProjectSerializer(serializers.ModelSerializer):
    client = ClientSerializer()  # nested client info
    team_members_details = serializers.SerializerMethodField()
    external_team_details = serializers.SerializerMethodField()
    overall_progress = serializers.IntegerField(default=0)


    assigned_sgm_email = serializers.ReadOnlyField(source="assigned_sgm.email")
    external_lead_email = serializers.ReadOnlyField(source="external_lead.email")

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "status", 
            "start_date", "end_date", "overall_progress", "project_hierarchy",
            "client", "assigned_sgm", "assigned_sgm_email", 
            "external_lead_email", "team_members_details", "external_team_details",
            "external_team",
        ]

    def get_team_members_details(self, obj):
        members = []
        seen_ids = set()

        for emp in obj.assigned_employees.select_related('user').all():
            user = emp.user
            seen_ids.add(user.id)
            members.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
            })

        # Backward-compatible fallback for legacy ProjectTeam rows.
        team = ProjectTeam.objects.filter(project=obj).first()
        if team:
            for member in team.internal_members.all():
                if member.id in seen_ids:
                    continue
                seen_ids.add(member.id)
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                })

        return members

    def get_external_team_details(self, obj):
        members = []
        seen_ids = set()

        for user in obj.external_team.all():
            seen_ids.add(user.id)
            members.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
            })

        # Backward-compatible fallback for legacy ProjectTeam rows.
        team = ProjectTeam.objects.filter(project=obj).first()
        if team:
            for member in team.external_members.all():
                if member.id in seen_ids:
                    continue
                seen_ids.add(member.id)
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                })

        return members


# -----------------------------
# Employee Serializer
# -----------------------------
class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    employee_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "full_name", "employee_profile_id"]

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username

    def get_employee_profile_id(self, obj):
        if hasattr(obj, 'employee_profile'):
            return obj.employee_profile.id
        return None


# -----------------------------
# Assign Internal Team Serializer
# -----------------------------
class ProjectTeamAssignSerializer(serializers.Serializer):
    employees = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    internal_members = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    external_members = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

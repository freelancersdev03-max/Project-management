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
class ProjectSerializer(serializers.ModelSerializer):
    client = ClientSerializer()  # nested client info

    class Meta:
        model = Project
        fields = ["id", "name", "client"]


# -----------------------------
# Employee Serializer
# -----------------------------
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


# -----------------------------
# Assign Internal Team Serializer
# -----------------------------
class ProjectTeamAssignSerializer(serializers.Serializer):
    employees = serializers.ListField(
        child=serializers.IntegerField()
    )

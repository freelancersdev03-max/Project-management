from rest_framework import serializers
from .models import Project
from django.contrib.auth import get_user_model

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source="client.company_name")
    assigned_sgm_email = serializers.ReadOnlyField(source="assigned_sgm.email")

    external_lead = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="EXTERNAL"),
        required=False,
        allow_null=True
    )

    external_lead_email = serializers.ReadOnlyField(source="external_lead.email")
    external_team_emails = serializers.SerializerMethodField()
    created_by_email = serializers.ReadOnlyField(source="created_by.email")

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",

            "client",
            "client_name",

            "assigned_sgm",
            "assigned_sgm_email",

            "external_lead",
            "external_lead_email",

            "external_team",
            "external_team_emails",

            "status",
            "start_date",
            "end_date",

            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]

        read_only_fields = ("created_by", "created_at", "updated_at")

    def get_external_team_emails(self, obj):
        return [u.email for u in obj.external_team.all()]

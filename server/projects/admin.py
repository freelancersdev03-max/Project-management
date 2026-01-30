from django.contrib import admin
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "client",
        "assigned_sgm",
        "external_lead_email",
        "external_team_list",
        "status",
        "created_at",
    )

    list_filter = ("status", "client")
    search_fields = ("name", "client__company_name")

    def external_lead_email(self, obj):
        return obj.external_lead.email if obj.external_lead else "-"
    external_lead_email.short_description = "External Lead"

    def external_team_list(self, obj):
        return ", ".join([user.email for user in obj.external_team.all()])
    external_team_list.short_description = "External Team"

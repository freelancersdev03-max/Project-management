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


from .models import ActionPlan, ActionTask

class ActionTaskInline(admin.TabularInline):
    model = ActionTask
    extra = 1

@admin.register(ActionPlan)
class ActionPlanAdmin(admin.ModelAdmin):
    list_display = ("project", "meeting_agenda", "created_at")
    search_fields = ("project__name",)
    list_filter = ("meeting_agenda",)
    inlines = [ActionTaskInline]

@admin.register(ActionTask)
class ActionTaskAdmin(admin.ModelAdmin):
    list_display = ("task", "action_plan", "assigned_to", "status", "target_date", "get_ats_score")
    list_filter = ("status", "action_plan__project__name")
    search_fields = ("task", "assigned_to__email")

    def get_ats_score(self, obj):
        return obj.get_ats_score()
    get_ats_score.short_description = "ATS Score"
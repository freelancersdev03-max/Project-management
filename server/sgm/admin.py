from django.contrib import admin
from .models import ProjectTeam

@admin.register(ProjectTeam)
class ProjectTeamAdmin(admin.ModelAdmin):
    list_display = ('project', 'assigned_at')
    search_fields = ('project__name', 'internal_members__username', 'internal_members__email', 'external_members__username', 'external_members__email')
    list_filter = ('project', 'assigned_at')

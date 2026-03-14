from django.contrib import admin

from .models import Achievement


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "employee",
        "assigned_by",
        "token_shared",
        "created_at",
    )
    list_filter = ("token_shared", "created_at")
    search_fields = ("title", "employee__email", "assigned_by__email")

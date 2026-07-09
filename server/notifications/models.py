from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    TASK_ASSIGNED = "TASK_ASSIGNED"
    DDTME_SUBMITTED = "DDTME_SUBMITTED"
    DDTME_APPROVED = "DDTME_APPROVED"
    DDTME_REJECTED = "DDTME_REJECTED"
    DDTME_EDIT_ALLOWED = "DDTME_EDIT_ALLOWED"
    REPEAT_TASK_REMINDER = "REPEAT_TASK_REMINDER"
    PROJECT_INCLUDED = "PROJECT_INCLUDED"
    VISIT_AGENDA_INCLUDED = "VISIT_AGENDA_INCLUDED"
    ACHIEVEMENT_AWARDED = "ACHIEVEMENT_AWARDED"
    ACTION_PLAN_NOT_SHARED = "ACTION_PLAN_NOT_SHARED"

    TYPE_CHOICES = [
        (TASK_ASSIGNED, "Task Assigned"),
        (DDTME_SUBMITTED, "DDTME Submitted"),
        (DDTME_APPROVED, "DDTME Approved"),
        (DDTME_REJECTED, "DDTME Rejected"),
        (DDTME_EDIT_ALLOWED, "DDTME Edit Allowed"),
        (REPEAT_TASK_REMINDER, "Repeat Task Reminder"),
        (PROJECT_INCLUDED, "Project Included"),
        (VISIT_AGENDA_INCLUDED, "Meeting Agenda Included"),
        (ACHIEVEMENT_AWARDED, "Achievement Awarded"),
        (ACTION_PLAN_NOT_SHARED, "Action Plan Not Shared"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")

    def mark_read(self):
        if self.is_read:
            return

        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at"])

    def __str__(self):
        return f"{self.title} -> {self.recipient.email}"

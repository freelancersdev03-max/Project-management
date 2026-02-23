from django.conf import settings
from django.db import models


class MCTCEntry(models.Model):
    TYPE_NORMAL = 'normal'
    TYPE_TASK = 'task'

    TYPE_CHOICES = [
        (TYPE_NORMAL, 'Normal'),
        (TYPE_TASK, 'Task'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mctc_entries'
    )
    entry_date = models.DateField(db_index=True)
    label = models.CharField(max_length=255)
    entry_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_NORMAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['entry_date', 'id']
        indexes = [
            models.Index(fields=['user', 'entry_date']),
        ]

    def __str__(self):
        return f"{self.user_id} | {self.entry_date} | {self.label}"

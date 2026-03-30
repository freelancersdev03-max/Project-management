from django.conf import settings
from django.db import models

from clients.models import Client


class VisitAgenda(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='visit_agendas')
    visit_date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visit_agendas_created'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visit_agendas_updated'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_date', '-updated_at']
        indexes = [
            models.Index(fields=['client', 'visit_date']),
        ]

    def __str__(self):
        return f"{self.client_id} | {self.visit_date}"


class VisitAgendaItem(models.Model):
    agenda = models.ForeignKey(VisitAgenda, on_delete=models.CASCADE, related_name='items')
    activity = models.TextField(blank=True)
    start_time = models.CharField(max_length=10, blank=True)
    end_time = models.CharField(max_length=10, blank=True)
    output = models.TextField(blank=True)
    team_members = models.TextField(blank=True)
    hqepl_reps = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='visit_agenda_items'
    )
    prior_tasks = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.agenda_id} | {self.order}"


class VisitAgendaLog(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='visit_agenda_logs')
    source_agenda = models.ForeignKey(
        VisitAgenda,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )
    visit_date = models.DateField()
    items = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='visit_agenda_logs_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']
        indexes = [
            models.Index(fields=['client', 'visit_date']),
        ]

    def __str__(self):
        return f"{self.client_id} | {self.visit_date} | {self.id}"

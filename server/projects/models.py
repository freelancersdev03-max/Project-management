from django.db import models
from django.conf import settings
from clients.models import Client

class Project(models.Model):
    
    STATUS_ACTIVE = "ACTIVE"
    STATUS_HOLD = "HOLD"
    STATUS_COMPLETED = "COMPLETED"
   

    STATUS_CHOICES = [
     
        (STATUS_ACTIVE, "Active"),
        (STATUS_HOLD, "On Hold"),
        (STATUS_COMPLETED, "Completed"),
        
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="projects"
    )

    assigned_sgm = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="assigned_projects",
        limit_choices_to={"role": "SGM"}
    )

    external_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="led_projects",
        limit_choices_to={"role": "EXTERNAL"}
    )

    external_team = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="projects",
        limit_choices_to={"role": "EXTERNAL"}
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_projects",
        limit_choices_to={"role__in": ["ADMIN", "HQEPL"]}
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE
    )

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.client.company_name}"

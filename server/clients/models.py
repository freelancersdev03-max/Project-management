from django.db import models
from django.conf import settings

class Client(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_profile"
    )
    company_name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="client_logos/", blank=True, null=True)
    contact_email = models.EmailField()
    phone = models.CharField(max_length=20)
    website = models.URLField(blank=True, null=True)
    address = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("hold", "Hold"), ("inactive", "Inactive")],
        default="active"
    )

    assigned_sgms = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_clients",
        blank=True,
        limit_choices_to={"role": "SGM"}
    )

    assigned_kayaara_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_kayaara_clients",
        blank=True,
        limit_choices_to={"role": "KAYAARA"},
        db_table="clients_client_assigned_hqepls"
    )

    internal_team = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="internal_teams",
        blank=True,
        limit_choices_to={"role": "EMPLOYEE"}
    )

    # Stores client-level hierarchy assignments used across project workflows.
    client_hierarchy = models.JSONField(default=list, blank=True)

    # External_Team = models.ManyToManyField(
    #     settings.AUTH_USER_MODEL,
    #     related_name="external_teams"
    # )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_clients"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company_name} ({self.user.email})"


class ExternalTeam(models.Model):
    client_org = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="external_members"
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    # role = models.CharField(max_length=50, default="EXTERNAL")  # ✅ REQUIRED
    status = models.CharField(
        max_length=20,
        choices=[("active", "Active"), ("hold", "Hold"), ("inactive", "Inactive")],
        default="active"
    )
    credential_access = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_external_members"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.client_org.company_name})"
    

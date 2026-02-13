from django.db import models
from django.contrib.auth import get_user_model
from projects.models import Project

User = get_user_model()


class ProjectTeam(models.Model):
    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name="sgm_team"
    )
    internal_members = models.ManyToManyField(
        User,
        blank=True,
        related_name="sgm_internal_projects",
        limit_choices_to={"role": "EMPLOYEE"}
    )
    external_members = models.ManyToManyField(
        User,
        blank=True,
        related_name="sgm_external_projects",
        limit_choices_to={"role": "EXTERNAL"}
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.project.name} - SGM Team"

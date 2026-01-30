from django.db import models
from django.contrib.auth import get_user_model
from projects.models import Project

User = get_user_model()


class ProjectTeam(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="project_team"
    )
    employee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "EMPLOYEE"}
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "employee")

    def __str__(self):
        return f"{self.project.name} - {self.employee.username}"

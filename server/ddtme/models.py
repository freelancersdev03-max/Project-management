from django.db import models
from projects.models import Project

class BigTask(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="big_tasks"
    )
    title = models.CharField(max_length=255)
    start_date = models.DateField()
    target_date = models.DateField()
    status = models.CharField(
        max_length=50,
        default='In Progress',
        choices=[('In Progress', 'In Progress'), ('Completed', 'Completed')]
    )
    # Type X or Y as per frontend usage
    # Defaulting to X if not provided
    type = models.CharField(max_length=10, default='X')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.project.name})"


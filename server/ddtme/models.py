from django.db import models
from projects.models import Project

class BigTask(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="big_tasks"
    )
    title = models.CharField(max_length=500)
    ddtme_title = models.CharField(max_length=500, blank=True, default='')
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
    parent_task = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subtasks'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.project.name})"


class DDTMESubmission(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='ddtme_submissions')
    month = models.IntegerField()
    year = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    remarks = models.TextField(blank=True, null=True)
    
    submitted_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True, related_name='submitted_ddtmes')
    approved_by = models.ForeignKey('accounts.CustomUser', on_delete=models.SET_NULL, null=True, related_name='approved_ddtmes')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'month', 'year')

    def __str__(self):
        return f"{self.client.company_name} - {self.month}/{self.year} ({self.status})"


class DDTMEAdditionalTask(models.Model):
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='ddtme_additional_tasks')
    project = models.ForeignKey('projects.Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='ddtme_additional_tasks')
    month = models.IntegerField()
    year = models.IntegerField()
    title = models.CharField(max_length=500)
    target_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class DDTMEMonthlyObjective(models.Model):
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='monthly_objectives')
    month = models.IntegerField()
    year = models.IntegerField()
    objective = models.TextField()
    is_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.objective[:50]}..."


class ManDayEntry(models.Model):
    employee = models.ForeignKey('employees.Employee', on_delete=models.CASCADE, related_name='manday_entries')
    # Or reference User if employees are Users. Checking Employee model reference...
    # In this project, Employee model is in 'employees' app usually linked to User.
    # Let's check imports. I'll use string reference 'employees.Employee'.
    
    month = models.IntegerField()
    year = models.IntegerField()
    
    # Link to either BigTask OR AdditionalTask
    big_task = models.ForeignKey(BigTask, on_delete=models.CASCADE, null=True, blank=True, related_name='manday_entries')
    additional_task = models.ForeignKey(DDTMEAdditionalTask, on_delete=models.CASCADE, null=True, blank=True, related_name='manday_entries')
    
    plan_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    off_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Unique constraint to prevent duplicate entries for same cell
        # constraints = [
        #     models.UniqueConstraint(
        #         fields=['employee', 'month', 'year', 'big_task'],
        #         condition=models.Q(additional_task__isnull=True),
        #         name='unique_entry_big_task'
        #     ),
        #     models.UniqueConstraint(
        #         fields=['employee', 'month', 'year', 'additional_task'],
        #         condition=models.Q(big_task__isnull=True),
        #         name='unique_entry_additional_task'
        #     )
        # ]
        pass

    def __str__(self):
        task_title = self.big_task.title if self.big_task else (self.additional_task.title if self.additional_task else "Unknown")
        return f"{self.employee} - {task_title} ({self.plan_hours}/{self.off_hours})"


class KPI(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="kpis"
    )
    name = models.CharField(max_length=255)
    baseline = models.CharField(max_length=100)
    target = models.CharField(max_length=100)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.project.name})"


class KPIUpdate(models.Model):
    kpi = models.ForeignKey(
        KPI,
        on_delete=models.CASCADE,
        related_name="updates"
    )
    month = models.DateField()  # Store as first day of the month
    update_value = models.CharField(max_length=255, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('kpi', 'month')

    def __str__(self):
        return f"{self.kpi.name} - {self.month.strftime('%Y-%m')}: {self.update_value}"


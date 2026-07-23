from django.db import models
from django.conf import settings
from projects.models import Project
from clients.models import Client
from datetime import date

class Task(models.Model):
    STATUS_CHOICES = [
        ('Backlog', 'Backlog'),
        ('Planning', 'Planning'),
        ('In Progress', 'In Progress'),
        ('Review', 'Review'),
        ('Testing', 'Testing'),
        ('Blocked', 'Blocked'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('On Time', 'On Time'),
        ('Delayed', 'Delayed'),
        ('Overdue', 'Overdue'),
    ]
    FLAG_CHOICES = [
        ('none', 'None'),
        ('document', 'Document'),
        ('training', 'Training'),
        ('resource', 'Resource'),
    ]
    PRIORITY_CHOICES = [
        ('HIGH', 'High'),
        ('MEDIUM', 'Medium'),
        ('LOW', 'Low'),
    ]

    task_id = models.CharField(max_length=20, unique=True, editable=False)
    title = models.CharField(max_length=1000)
    description = models.TextField(blank=True, null=True)

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_tasks', null=True, blank=True)
    client_org = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='client_tasks', null=True, blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_assignments_received'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='task_assignments_given'
    )

    # Dates required for your formulas
    start_date = models.DateField(default=date.today)
    target_date = models.DateField()
    completion_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Backlog')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='LOW')
    flag = models.CharField(max_length=20, choices=FLAG_CHOICES, default='none', blank=True)
    remarks = models.TextField(blank=True, null=True)

    # Estimated vs Actual Hours
    estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # Repeatable Task Fields
    is_repeatable = models.BooleanField(default=False)
    repeat_frequency = models.CharField(max_length=20, choices=[('Daily', 'Daily'), ('Weekly', 'Weekly'), ('Monthly', 'Monthly')], blank=True, null=True)
    repeat_end_date = models.DateField(null=True, blank=True)
    repeat_day = models.CharField(max_length=100, blank=True, null=True)
    repeat_week = models.CharField(max_length=100, blank=True, null=True)

    # Files & Source
    assigned_file = models.FileField(upload_to='tasks/assignments/', null=True, blank=True)
    completion_file = models.FileField(upload_to='tasks/completions/', null=True, blank=True)
    source_module = models.CharField(max_length=50, default='DIRECT') 
    source_ref_id = models.IntegerField(null=True, blank=True)
    ats_score = models.FloatField(null=True, blank=True)

    def calculate_ats_value(self):
        """
        Calculates ATS based on User's strict formulas.
        """
        if self.status == 'In Progress':
            return None
        if self.status == 'Overdue':
            return 0.0
        
        # For Delayed Tasks: Formula = (target_date - start_date) / (completion_date - start_date)
        if self.status == 'Delayed' and self.completion_date:
            start = self.start_date
            target = self.target_date
            comp = self.completion_date
            
            # Case 0: If all dates are same -> 100%
            if start == target == comp:
                return 100.0
            
            # Case 0b: If target > completion (finished early) -> 100%
            if target > comp:
                return 100.0
            
            denom = (comp - start).days
            
            if denom == 0:
                return 100.0
            
            # Case 1: Start == Target (Special case)
            # Formula: 1 / ((Completion - Start) + 1) * 100
            if start == target:
                return round((1 / (denom + 1)) * 100, 2)
            
            # Case 2: Start != Target (Standard case)
            # Formula: (Target - Start) / (Completion - Start) * 100
            num = (target - start).days
            val = (num / denom) * 100
            if val < 0: val = 0.0  # Sanity check
            return round(val, 2)
            
        # For Completed/On Time Tasks
        if self.status in ['Completed', 'On Time'] and self.completion_date:
            # Case 4: Target > Completion (Finished early) -> 100%
            if self.target_date > self.completion_date:
                return 100.0

            # Case 1: Start == Completion == Target -> 100%
            if self.start_date == self.completion_date == self.target_date:
                return 100.0

            start = self.start_date
            target = self.target_date
            comp = self.completion_date

            # Case 2: Start == Target != Completion (Standard logic from notes)
            # Interpretation: 1 / (Completion - Start) * 100
            if start == target and comp != start:
                denom = (comp - start).days + 1
                if denom == 0: return 100.0
                return round((1 / denom) * 100, 2)

            # Case 3: Start != Target != Completion
            # Formula: (Target - Start) / (Completion - Start)
            num = (target - start).days
            denom = (comp - start).days

            if denom == 0: 
                return 100.0 if num >= 0 else 0.0
            
            val = (num / denom) * 100
            if val < 0: val = 0.0 # Sanity check
            return round(val, 2)
            
        return 0.0

    MANUAL_STATUSES = ['Backlog', 'Planning', 'Review', 'Testing', 'Blocked', 'Cancelled']

    def save(self, *args, **kwargs):
        if not self.task_id:
            last_task = Task.objects.all().order_by('id').last()
            self.task_id = f'T-{last_task.id + 101}' if last_task else 'T-101'

        # For manual workflow statuses, don't auto-override based on dates
        if self.status in self.MANUAL_STATUSES:
            self.ats_score = None
            super().save(*args, **kwargs)
            return

        # If completion_date is set, derive On Time vs Delayed from dates
        if self.completion_date:
            if self.completion_date > self.target_date:
                self.status = 'Delayed'
            else:
                self.status = 'On Time'
        # Auto-update status to Overdue if today > target_date and not completed
        elif self.status not in ['Completed', 'On Time'] and date.today() > self.target_date:
            self.status = 'Overdue'

        # ATS Logic Update
        if self.status == 'In Progress':
             self.ats_score = None
        elif self.status == 'Overdue':
             self.ats_score = 0.0
        elif self.status == 'Delayed':
             self.ats_score = self.calculate_ats_value()
        elif self.status in ['Completed', 'On Time']:
             self.ats_score = self.calculate_ats_value()
        else:
             # Default fallback
             self.ats_score = None

        super().save(*args, **kwargs)

    def update_actual_hours(self):
        """Recalculates actual_hours based on sum of TimeEntry durations."""
        total_mins = self.time_entries.aggregate(total=models.Sum('duration_minutes'))['total'] or 0
        self.actual_hours = round(total_mins / 60.0, 2)
        Task.objects.filter(id=self.id).update(actual_hours=self.actual_hours)
        return self.actual_hours


class TimeEntry(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_entries')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='time_entries')
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    is_running = models.BooleanField(default=False)
    is_billable = models.BooleanField(default=True)
    date = models.DateField(default=date.today)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.task.task_id} ({self.duration_minutes}m)"


class SavedFilter(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_filters')
    name = models.CharField(max_length=150)
    entity_type = models.CharField(max_length=50, default='TASK')
    filter_params = models.JSONField(default=dict)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.name} ({self.entity_type})"

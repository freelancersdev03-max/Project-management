from django.db import models
from django.conf import settings
from projects.models import Project
from clients.models import Client
from datetime import date

class Task(models.Model):
    STATUS_CHOICES = [
        ('On Time', 'On Time'),
        ('In Progress', 'In Progress'),
        ('Delayed', 'Delayed'),
        ('Overdue', 'Overdue'),
        ('Completed', 'Completed'),
    ]

    task_id = models.CharField(max_length=20, unique=True, editable=False)
    title = models.CharField(max_length=255)
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
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='In Progress')
    remarks = models.TextField(blank=True, null=True)

    # Repeatable Task Fields
    is_repeatable = models.BooleanField(default=False)
    repeat_frequency = models.CharField(max_length=20, choices=[('Weekly', 'Weekly'), ('Monthly', 'Monthly')], blank=True, null=True)
    repeat_end_date = models.DateField(null=True, blank=True)
    repeat_day = models.CharField(max_length=20, choices=[
        ('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'),
        ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday'), ('Sunday', 'Sunday')
    ], blank=True, null=True)
    repeat_week = models.CharField(max_length=20, choices=[
        ('First', 'First'), ('Second', 'Second'), ('Third', 'Third'), ('Fourth', 'Fourth'), ('Last', 'Last')
    ], blank=True, null=True)

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

    def save(self, *args, **kwargs):
        if not self.task_id:
            last_task = Task.objects.all().order_by('id').last()
            self.task_id = f'T-{last_task.id + 101}' if last_task else 'T-101'

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
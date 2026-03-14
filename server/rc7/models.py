from django.db import models
from accounts.models import CustomUser

class RC7Plan(models.Model):
    PLAN_TYPES = [
        ('sat', 'Saturday Cycle'),
        ('wed', 'Wednesday Cycle')
    ]

    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='rc7_plans')
    date = models.DateField()
    location = models.CharField(max_length=255, blank=True)
    deliverable = models.TextField(blank=True)
    plan_type = models.CharField(max_length=3, choices=PLAN_TYPES)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'date', 'plan_type')
        ordering = ['date']

    def __str__(self):
        return f"{self.employee.username} - {self.date} ({self.plan_type})"

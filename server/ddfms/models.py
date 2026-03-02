from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class DDFMSPlan(models.Model):
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='ddfms_plans'
    )
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    year = models.IntegerField(validators=[MinValueValidator(2000), MaxValueValidator(2100)])
    start_working_date = models.DateField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_ddfms_plans'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_ddfms_plans'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'month', 'year')
        ordering = ['-year', '-month', '-created_at']

    def __str__(self):
        return f"{self.client} - {self.month}/{self.year}"


class DDFMSDeliverable(models.Model):
    SOURCE_BIG_TASK = 'BIG_TASK'
    SOURCE_ADDITIONAL_TASK = 'ADDITIONAL_TASK'
    SOURCE_MANUAL = 'MANUAL'

    SOURCE_CHOICES = [
        (SOURCE_BIG_TASK, 'Big Task'),
        (SOURCE_ADDITIONAL_TASK, 'Additional Task'),
        (SOURCE_MANUAL, 'Manual'),
    ]

    plan = models.ForeignKey(
        DDFMSPlan,
        on_delete=models.CASCADE,
        related_name='deliverables'
    )
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    source_id = models.PositiveIntegerField(null=True, blank=True)

    title = models.CharField(max_length=255)
    target_date = models.DateField(null=True, blank=True)
    order_index = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order_index', 'id']

    def __str__(self):
        return self.title


class DDFMSStep(models.Model):
    deliverable = models.ForeignKey(
        DDFMSDeliverable,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    step_number = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ddfms_steps'
    )
    target_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('deliverable', 'step_number')
        ordering = ['step_number']

    def __str__(self):
        return f"{self.deliverable.title} - Step {self.step_number}"

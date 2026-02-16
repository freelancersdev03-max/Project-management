from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Project, ActionPlan


@receiver(post_save, sender=Project)
def create_action_plan(sender, instance, created, **kwargs):
    if created:
        ActionPlan.objects.create(project=instance)
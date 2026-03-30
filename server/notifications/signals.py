from django.contrib.auth import get_user_model
from django.db.models.signals import m2m_changed, post_save, pre_save
from django.dispatch import receiver

from achievement.models import Achievement
from clients.models import Client
from ddtme.models import DDTMESubmission
from employees.models import Employee
from projects.models import ActionTask, Project
from tasks.models import Task
from visit_agenda.models import VisitAgendaItem

from .models import Notification
from .utils import create_notification, get_user_display_name

User = get_user_model()


def _project_metadata(project, role=None):
    metadata = {
        "project_id": project.id,
        "project_name": project.name,
        "client_id": project.client_id,
        "client_name": project.client.company_name,
    }
    if role:
        metadata["role"] = role
    return metadata


def _client_metadata(client, role=None):
    metadata = {
        "entity": "CLIENT",
        "client_id": client.id,
        "client_name": client.company_name,
    }
    if role:
        metadata["role"] = role
    return metadata


def _visit_agenda_metadata(agenda):
    return {
        "client_id": agenda.client_id,
        "client_name": agenda.client.company_name,
        "agenda_id": agenda.id,
        "visit_date": agenda.visit_date.isoformat(),
    }


def _achievement_metadata(achievement, employee_name, assigner_name):
    return {
        "achievement_id": achievement.id,
        "achievement_title": achievement.title,
        "achievement_description": achievement.description,
        "employee_id": achievement.employee_id,
        "employee_name": employee_name,
        "assigned_by_id": achievement.assigned_by_id,
        "assigned_by_name": assigner_name,
    }


def _task_metadata(task, source_module):
    client = task.client_org if getattr(task, "client_org_id", None) else None
    project = task.project if getattr(task, "project_id", None) else None
    if project and not client:
        client = project.client

    metadata = {
        "task_id": task.id,
        "task_title": task.title,
        "source_module": source_module,
    }
    if project:
        metadata["project_id"] = project.id
        metadata["project_name"] = project.name
    if client:
        metadata["client_id"] = client.id
        metadata["client_name"] = client.company_name
    return metadata


def _create_task_assignment_notification(recipient, title, context_label, assigner_name, metadata):
    if not recipient:
        return

    if context_label:
        message = f'{assigner_name} assigned you the task "{title}" for {context_label}.'
    else:
        message = f'{assigner_name} assigned you the task "{title}".'

    create_notification(
        recipient=recipient,
        notification_type=Notification.TASK_ASSIGNED,
        title="New task assigned",
        message=message,
        metadata=metadata,
    )


@receiver(pre_save, sender=Task)
def store_previous_task_assignee(sender, instance, **kwargs):
    instance._previous_assigned_to_id = None
    if not instance.pk:
        return

    try:
        previous = sender.objects.only("assigned_to_id").get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    instance._previous_assigned_to_id = previous.assigned_to_id


@receiver(post_save, sender=Task)
def notify_task_assignment(sender, instance, created, **kwargs):
    previous_assigned_to_id = getattr(instance, "_previous_assigned_to_id", None)
    should_notify = False

    if created and instance.assigned_to_id:
        should_notify = True
    elif instance.assigned_to_id and previous_assigned_to_id != instance.assigned_to_id:
        should_notify = True

    if not should_notify:
        return

    context_label = None
    if instance.project_id:
        context_label = instance.project.name
    elif instance.client_org_id:
        context_label = instance.client_org.company_name

    assigner_name = get_user_display_name(instance.assigned_by)
    _create_task_assignment_notification(
        recipient=instance.assigned_to,
        title=instance.title,
        context_label=context_label,
        assigner_name=assigner_name,
        metadata=_task_metadata(instance, instance.source_module),
    )


@receiver(pre_save, sender=ActionTask)
def store_previous_action_task_assignee(sender, instance, **kwargs):
    instance._previous_assigned_to_id = None
    if not instance.pk:
        return

    try:
        previous = sender.objects.only("assigned_to_id").get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    instance._previous_assigned_to_id = previous.assigned_to_id


@receiver(post_save, sender=ActionTask)
def notify_action_task_assignment(sender, instance, created, **kwargs):
    previous_assigned_to_id = getattr(instance, "_previous_assigned_to_id", None)
    should_notify = False

    if created and instance.assigned_to_id:
        should_notify = True
    elif instance.assigned_to_id and previous_assigned_to_id != instance.assigned_to_id:
        should_notify = True

    if not should_notify:
        return

    project = instance.action_plan.project
    assigner_name = get_user_display_name(instance.assigned_by)
    create_notification(
        recipient=instance.assigned_to,
        notification_type=Notification.TASK_ASSIGNED,
        title="New task assigned",
        message=f'{assigner_name} assigned you the task "{instance.task}" for {project.name}.',
        metadata={
            "task_id": instance.id,
            "task_title": instance.task,
            "project_id": project.id,
            "project_name": project.name,
            "client_id": project.client_id,
            "client_name": project.client.company_name,
            "source_module": "ACTION_TASK",
        },
    )


@receiver(pre_save, sender=DDTMESubmission)
def store_previous_ddtme_status(sender, instance, **kwargs):
    instance._previous_status = None
    if not instance.pk:
        return

    try:
        previous = sender.objects.only("status").get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    instance._previous_status = previous.status


@receiver(post_save, sender=DDTMESubmission)
def notify_ddtme_status(sender, instance, created, **kwargs):
    previous_status = getattr(instance, "_previous_status", None)

    if instance.status == "Draft" and previous_status == "Approved":
        recipients = set(instance.client.internal_team.all())
        if instance.submitted_by:
            recipients.add(instance.submitted_by)

        message = (
            f"DDTME for {instance.client.company_name} was reopened for edit. "
            "Please update and submit again for approval."
        )

        for recipient in recipients:
            create_notification(
                recipient=recipient,
                notification_type=Notification.DDTME_EDIT_ALLOWED,
                title="DDTME edit allowed",
                message=message,
                metadata={
                    "submission_id": instance.id,
                    "client_id": instance.client_id,
                    "client_name": instance.client.company_name,
                    "month": instance.month,
                    "year": instance.year,
                    "status": instance.status,
                    "previous_status": previous_status,
                },
            )
        return

    if instance.status not in {"Submitted", "Approved", "Rejected"}:
        return

    if not created and previous_status == instance.status:
        return

    if instance.status == "Submitted":
        submitter_name = get_user_display_name(instance.submitted_by)
        message = f"{submitter_name} submitted DDTME for {instance.client.company_name} for approval."

        assigned_sgms = instance.client.assigned_sgms.all()
        for sgm in assigned_sgms:
            create_notification(
                recipient=sgm,
                notification_type=Notification.DDTME_SUBMITTED,
                title="DDTME submitted for approval",
                message=message,
                metadata={
                    "submission_id": instance.id,
                    "client_id": instance.client_id,
                    "client_name": instance.client.company_name,
                    "month": instance.month,
                    "year": instance.year,
                    "status": instance.status,
                },
            )
        return

    if not instance.submitted_by:
        return

    notification_type = (
        Notification.DDTME_APPROVED
        if instance.status == "Approved"
        else Notification.DDTME_REJECTED
    )
    title = "DDTME approved" if instance.status == "Approved" else "DDTME rejected"
    message = f"DDTME for {instance.client.company_name} was {instance.status.lower()}."
    if instance.status == "Rejected" and instance.remarks:
        message = f"{message} Remarks: {instance.remarks}"

    create_notification(
        recipient=instance.submitted_by,
        notification_type=notification_type,
        title=title,
        message=message,
        metadata={
            "submission_id": instance.id,
            "client_id": instance.client_id,
            "client_name": instance.client.company_name,
            "month": instance.month,
            "year": instance.year,
            "status": instance.status,
        },
    )


@receiver(pre_save, sender=Project)
def store_previous_project_roles(sender, instance, **kwargs):
    instance._previous_assigned_sgm_id = None
    instance._previous_external_lead_id = None
    if not instance.pk:
        return

    try:
        previous = sender.objects.only("assigned_sgm_id", "external_lead_id").get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    instance._previous_assigned_sgm_id = previous.assigned_sgm_id
    instance._previous_external_lead_id = previous.external_lead_id


@receiver(post_save, sender=Project)
def notify_project_role_assignments(sender, instance, created, **kwargs):
    previous_assigned_sgm_id = getattr(instance, "_previous_assigned_sgm_id", None)
    previous_external_lead_id = getattr(instance, "_previous_external_lead_id", None)

    if instance.assigned_sgm_id and (created or previous_assigned_sgm_id != instance.assigned_sgm_id):
        create_notification(
            recipient=instance.assigned_sgm,
            notification_type=Notification.PROJECT_INCLUDED,
            title="Added to project",
            message=f"You were assigned as SGM to the project {instance.name} for {instance.client.company_name}.",
            metadata=_project_metadata(instance, role="SGM"),
        )

    if instance.external_lead_id and (created or previous_external_lead_id != instance.external_lead_id):
        create_notification(
            recipient=instance.external_lead,
            notification_type=Notification.PROJECT_INCLUDED,
            title="Added to project",
            message=f"You were added as external lead to the project {instance.name} for {instance.client.company_name}.",
            metadata=_project_metadata(instance, role="EXTERNAL_LEAD"),
        )


@receiver(m2m_changed, sender=Project.assigned_employees.through)
def notify_internal_project_members(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return

    employees = Employee.objects.select_related("user").filter(pk__in=pk_set)
    for employee in employees:
        create_notification(
            recipient=employee.user,
            notification_type=Notification.PROJECT_INCLUDED,
            title="Added to project",
            message=f"You were added to the project {instance.name} for {instance.client.company_name}.",
            metadata=_project_metadata(instance, role="EMPLOYEE"),
        )


@receiver(m2m_changed, sender=Project.external_team.through)
def notify_external_project_members(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return

    for member in instance.external_team.filter(pk__in=pk_set):
        create_notification(
            recipient=member,
            notification_type=Notification.PROJECT_INCLUDED,
            title="Added to project",
            message=f"You were added to the project {instance.name} for {instance.client.company_name}.",
            metadata=_project_metadata(instance, role="EXTERNAL"),
        )


@receiver(m2m_changed, sender=Client.assigned_sgms.through)
def notify_client_assigned_sgms(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return

    for sgm in instance.assigned_sgms.filter(pk__in=pk_set):
        create_notification(
            recipient=sgm,
            notification_type=Notification.PROJECT_INCLUDED,
            title="Added to client",
            message=f"You were assigned to the client {instance.company_name}.",
            metadata=_client_metadata(instance, role="SGM"),
        )


@receiver(m2m_changed, sender=Client.internal_team.through)
def notify_client_internal_team(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return

    for member in instance.internal_team.filter(pk__in=pk_set):
        create_notification(
            recipient=member,
            notification_type=Notification.PROJECT_INCLUDED,
            title="Added to client",
            message=f"You were added to the client team for {instance.company_name}.",
            metadata=_client_metadata(instance, role="EMPLOYEE"),
        )


@receiver(m2m_changed, sender=VisitAgendaItem.hqepl_reps.through)
def notify_visit_agenda_members(sender, instance, action, pk_set, **kwargs):
    if action != "post_add" or not pk_set:
        return

    agenda = instance.agenda
    visit_date_iso = agenda.visit_date.isoformat()
    visit_date_display = agenda.visit_date.strftime("%d %b %Y")

    for member in instance.hqepl_reps.filter(pk__in=pk_set):
        already_notified = Notification.objects.filter(
            recipient=member,
            notification_type=Notification.VISIT_AGENDA_INCLUDED,
            metadata__agenda_id=agenda.id,
            metadata__visit_date=visit_date_iso,
        ).exists()
        if already_notified:
            continue

        create_notification(
            recipient=member,
            notification_type=Notification.VISIT_AGENDA_INCLUDED,
            title="Added to visit agenda",
            message=(
                f"You were added to the visit agenda for {agenda.client.company_name} "
                f"on {visit_date_display}."
            ),
            metadata=_visit_agenda_metadata(agenda),
        )


@receiver(post_save, sender=Achievement)
def notify_achievement_awarded(sender, instance, created, **kwargs):
    if not created:
        return

    employee_name = get_user_display_name(instance.employee)
    assigner_name = get_user_display_name(instance.assigned_by)
    message = (
        f'{employee_name} received the achievement "{instance.title}" '
        f"assigned by {assigner_name}."
    )
    if instance.description:
        message = f"{message} Details: {instance.description}"

    metadata = _achievement_metadata(instance, employee_name, assigner_name)
    recipients = User.objects.filter(
        role__in=[User.EMPLOYEE, User.SGM, User.HQEPL, User.ADMIN],
    )

    for recipient in recipients:
        create_notification(
            recipient=recipient,
            notification_type=Notification.ACHIEVEMENT_AWARDED,
            title="Achievement awarded",
            message=message,
            metadata=metadata,
        )

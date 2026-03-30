from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError
from tasks.models import Task

from .models import DDFMSPlan, DDFMSDeliverable, DDFMSStep
from .serializers import DDFMSPlanSerializer, DDFMSDeliverableSerializer, DDFMSStepSerializer


COMPLETED_TASK_STATUSES = ['Completed', 'On Time']


def shift_sunday_to_saturday(date_value):
    if not date_value:
        return date_value
    if date_value.weekday() == 6:
        return date_value - timedelta(days=1)
    return date_value


def sync_ddfms_step_task(step, actor):
    task_queryset = Task.objects.filter(source_module='DDFMS', source_ref_id=step.id)
    active_tasks = task_queryset.exclude(status__in=COMPLETED_TASK_STATUSES)

    if not step.deliverable.is_submitted or not step.responsible or not step.target_date:
        # During edit mode, keep completed historical tasks but remove pending ones.
        active_tasks.delete()
        return

    # If this step is already completed, keep it immutable and remove any extra pending duplicates.
    if task_queryset.filter(status__in=COMPLETED_TASK_STATUSES).exists():
        active_tasks.delete()
        return

    deliverable = step.deliverable
    plan = deliverable.plan
    normalized_target_date = shift_sunday_to_saturday(step.target_date)
    step_start_date = deliverable.start_date or normalized_target_date

    defaults = {
        'title': f'{deliverable.title} - Step {step.step_number}',
        'description': f'DDFMS task for {plan.client.company_name} ({plan.month}/{plan.year}), Step {step.step_number}.',
        'project': None,
        'client_org': plan.client,
        'assigned_to': step.responsible,
        'assigned_by': actor,
        'start_date': step_start_date,
        'target_date': normalized_target_date,
        'remarks': step.remarks or '',
    }

    task_obj = active_tasks.order_by('-id').first()
    if task_obj:
        for field_name, field_value in defaults.items():
            setattr(task_obj, field_name, field_value)
        task_obj.save()
        return

    Task.objects.create(
        source_module='DDFMS',
        source_ref_id=step.id,
        **defaults,
    )


class DDFMSPlanViewSet(viewsets.ModelViewSet):
    serializer_class = DDFMSPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DDFMSPlan.objects.select_related('client', 'created_by', 'updated_by').all()

    def get_queryset(self):
        queryset = super().get_queryset()

        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class DDFMSDeliverableViewSet(viewsets.ModelViewSet):
    serializer_class = DDFMSDeliverableSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DDFMSDeliverable.objects.select_related('plan', 'plan__client').all()

    def _validate_submit_ready(self, deliverable):
        required_step_numbers = range(1, 8)
        step_map = {step.step_number: step for step in deliverable.steps.all()}

        invalid_steps = []
        for step_number in required_step_numbers:
            step = step_map.get(step_number)
            if not step or not step.responsible_id or not step.target_date:
                invalid_steps.append(step_number)

        if invalid_steps:
            raise ValidationError({
                'is_submitted': (
                    f'Cannot submit deliverable until Steps {invalid_steps} have both responsible person and target date.'
                )
            })

    def _sync_deliverable_tasks(self, deliverable):
        for step in deliverable.steps.all():
            sync_ddfms_step_task(step, self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()

        plan_id = self.request.query_params.get('plan_id')
        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        source_type = self.request.query_params.get('source_type')
        source_id = self.request.query_params.get('source_id')

        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)
        if client_id:
            queryset = queryset.filter(plan__client_id=client_id)
        if month:
            queryset = queryset.filter(plan__month=month)
        if year:
            queryset = queryset.filter(plan__year=year)
        if source_type:
            queryset = queryset.filter(source_type=source_type)
        if source_id:
            queryset = queryset.filter(source_id=source_id)

        return queryset

    def perform_update(self, serializer):
        current = self.get_object()
        next_is_submitted = serializer.validated_data.get('is_submitted', current.is_submitted)

        if next_is_submitted and not current.is_submitted:
            self._validate_submit_ready(current)
            deliverable = serializer.save(
                submitted_at=timezone.now(),
                submitted_by=self.request.user,
            )
        elif not next_is_submitted and current.is_submitted:
            deliverable = serializer.save(submitted_at=None, submitted_by=None)
        else:
            deliverable = serializer.save()

        self._sync_deliverable_tasks(deliverable)


class DDFMSStepViewSet(viewsets.ModelViewSet):
    serializer_class = DDFMSStepSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DDFMSStep.objects.select_related(
        'deliverable',
        'deliverable__plan',
        'deliverable__plan__client',
        'responsible'
    ).all()

    def get_queryset(self):
        queryset = super().get_queryset()

        deliverable_id = self.request.query_params.get('deliverable_id')
        plan_id = self.request.query_params.get('plan_id')
        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        step_number = self.request.query_params.get('step_number')

        if deliverable_id:
            queryset = queryset.filter(deliverable_id=deliverable_id)
        if plan_id:
            queryset = queryset.filter(deliverable__plan_id=plan_id)
        if client_id:
            queryset = queryset.filter(deliverable__plan__client_id=client_id)
        if month:
            queryset = queryset.filter(deliverable__plan__month=month)
        if year:
            queryset = queryset.filter(deliverable__plan__year=year)
        if step_number:
            queryset = queryset.filter(step_number=step_number)

        return queryset

    def perform_create(self, serializer):
        step = serializer.save()
        sync_ddfms_step_task(step, self.request.user)

    def perform_update(self, serializer):
        step = serializer.save()
        sync_ddfms_step_task(step, self.request.user)

    def perform_destroy(self, instance):
        Task.objects.filter(source_module='DDFMS', source_ref_id=instance.id).delete()
        instance.delete()

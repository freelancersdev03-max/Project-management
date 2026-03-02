from rest_framework import permissions, viewsets
from tasks.models import Task

from .models import DDFMSPlan, DDFMSDeliverable, DDFMSStep
from .serializers import DDFMSPlanSerializer, DDFMSDeliverableSerializer, DDFMSStepSerializer


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

    def _sync_step_task(self, step, actor):
        task_queryset = Task.objects.filter(source_module='DDFMS', source_ref_id=step.id)

        if not step.responsible or not step.target_date:
            task_queryset.delete()
            return

        deliverable = step.deliverable
        plan = deliverable.plan

        defaults = {
            'title': f'{deliverable.title} - Step {step.step_number}',
            'description': f'DDFMS task for {plan.client.company_name} ({plan.month}/{plan.year}), Step {step.step_number}.',
            'project': None,
            'client_org': plan.client,
            'assigned_to': step.responsible,
            'assigned_by': actor,
            'target_date': step.target_date,
            'remarks': step.remarks or '',
        }

        Task.objects.update_or_create(
            source_module='DDFMS',
            source_ref_id=step.id,
            defaults=defaults,
        )

    def perform_create(self, serializer):
        step = serializer.save()
        self._sync_step_task(step, self.request.user)

    def perform_update(self, serializer):
        step = serializer.save()
        self._sync_step_task(step, self.request.user)

    def perform_destroy(self, instance):
        Task.objects.filter(source_module='DDFMS', source_ref_id=instance.id).delete()
        instance.delete()

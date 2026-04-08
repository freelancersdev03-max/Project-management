from datetime import timedelta

from rest_framework import serializers
from tasks.models import Task
from ddtme.models import BigTask, DDTMEAdditionalTask

from .models import DDFMSPlan, DDFMSDeliverable, DDFMSStep


def shift_sunday_to_saturday(date_value):
    if not date_value:
        return date_value
    if date_value.weekday() == 6:
        return date_value - timedelta(days=1)
    return date_value


class DDFMSStepSerializer(serializers.ModelSerializer):
    start_date = serializers.DateField(source='deliverable.start_date', read_only=True)
    responsible_name = serializers.CharField(source='responsible.username', read_only=True)
    has_completed_task = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

    def get_has_completed_task(self, obj):
        return Task.objects.filter(
            source_module='DDFMS',
            source_ref_id=obj.id,
            status__in=['Completed', 'On Time']
        ).exists()

    def get_project_name(self, obj):
        deliverable = getattr(obj, 'deliverable', None)
        if not deliverable:
            return None

        if deliverable.source_type == DDFMSDeliverable.SOURCE_BIG_TASK and deliverable.source_id:
            big_task = BigTask.objects.select_related('project').filter(id=deliverable.source_id).first()
            if big_task and big_task.project:
                return big_task.project.name

        if deliverable.source_type == DDFMSDeliverable.SOURCE_ADDITIONAL_TASK and deliverable.source_id:
            additional_task = DDTMEAdditionalTask.objects.select_related('project').filter(id=deliverable.source_id).first()
            if additional_task and additional_task.project:
                return additional_task.project.name

        return None

    class Meta:
        model = DDFMSStep
        fields = [
            'id',
            'deliverable',
            'step_number',
            'project_name',
            'start_date',
            'responsible',
            'responsible_name',
            'has_completed_task',
            'target_date',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'start_date', 'responsible_name']

    def validate(self, attrs):
        target_date = attrs.get('target_date')
        if target_date:
            attrs['target_date'] = shift_sunday_to_saturday(target_date)
        return attrs


class DDFMSDeliverableSerializer(serializers.ModelSerializer):
    steps = DDFMSStepSerializer(many=True, read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.username', read_only=True)

    class Meta:
        model = DDFMSDeliverable
        fields = [
            'id',
            'plan',
            'source_type',
            'source_id',
            'title',
            'start_date',
            'target_date',
            'order_index',
            'is_submitted',
            'submitted_at',
            'submitted_by',
            'submitted_by_name',
            'steps',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'steps', 'submitted_at', 'submitted_by_name']

    def validate(self, attrs):
        target_date = attrs.get('target_date')
        if target_date:
            attrs['target_date'] = shift_sunday_to_saturday(target_date)
        return attrs


class DDFMSPlanSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.company_name', read_only=True)
    deliverables = DDFMSDeliverableSerializer(many=True, read_only=True)

    class Meta:
        model = DDFMSPlan
        fields = [
            'id',
            'client',
            'client_name',
            'month',
            'year',
            'start_working_date',
            'created_by',
            'updated_by',
            'deliverables',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
            'client_name',
            'deliverables',
        ]

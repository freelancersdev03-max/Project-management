from rest_framework import serializers

from .models import DDFMSPlan, DDFMSDeliverable, DDFMSStep


class DDFMSStepSerializer(serializers.ModelSerializer):
    start_date = serializers.DateField(source='deliverable.start_date', read_only=True)
    responsible_name = serializers.CharField(source='responsible.username', read_only=True)

    class Meta:
        model = DDFMSStep
        fields = [
            'id',
            'deliverable',
            'step_number',
            'start_date',
            'responsible',
            'responsible_name',
            'target_date',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'start_date', 'responsible_name']


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

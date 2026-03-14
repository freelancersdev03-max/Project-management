from rest_framework import serializers
from .models import RC7Plan

class RC7PlanSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        location = attrs.get('location', getattr(self.instance, 'location', ''))
        deliverable = attrs.get('deliverable', getattr(self.instance, 'deliverable', ''))

        if str(location or '').strip().lower() == 'holiday' and str(deliverable or '').strip():
            raise serializers.ValidationError({
                'deliverable': 'Deliverable must be empty when location is Holiday.'
            })

        return attrs

    class Meta:
        model = RC7Plan
        fields = ['id', 'employee', 'date', 'location', 'deliverable', 'plan_type', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

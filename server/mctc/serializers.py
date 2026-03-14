from rest_framework import serializers

from .models import MCTCEntry


class MCTCEntrySerializer(serializers.ModelSerializer):
    linked_task_status = serializers.ReadOnlyField(source='linked_task.status')
    linked_task_completion_date = serializers.ReadOnlyField(source='linked_task.completion_date')

    class Meta:
        model = MCTCEntry
        fields = [
            'id',
            'entry_date',
            'label',
            'entry_type',
            'linked_task',
            'linked_task_status',
            'linked_task_completion_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        entry_date = attrs.get('entry_date') or getattr(self.instance, 'entry_date', None)
        if entry_date and entry_date.weekday() == 6:
            raise serializers.ValidationError({
                'entry_date': 'No task can be created for Sunday.'
            })

        linked_task = attrs.get('linked_task')
        request = self.context.get('request')

        if linked_task and request and request.user:
            user_id = request.user.id
            if linked_task.assigned_to_id != user_id and linked_task.assigned_by_id != user_id:
                raise serializers.ValidationError({
                    'linked_task': 'You can only link tasks assigned to you or created by you.'
                })

        return attrs

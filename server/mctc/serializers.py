from rest_framework import serializers

from .models import MCTCEntry


class MCTCEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MCTCEntry
        fields = [
            'id',
            'entry_date',
            'label',
            'entry_type',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

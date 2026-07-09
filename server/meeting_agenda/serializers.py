from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import MeetingAgenda, MeetingAgendaItem, MeetingAgendaLog

User = get_user_model()


class MeetingAgendaItemSerializer(serializers.ModelSerializer):
    kayaara_reps = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(is_active=True),
        required=False
    )
    kayaara_rep_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MeetingAgendaItem
        fields = [
            'id',
            'activity',
            'start_time',
            'end_time',
            'output',
            'team_members',
            'kayaara_reps',
            'kayaara_rep_names',
            'prior_tasks',
            'order',
        ]

    def get_kayaara_rep_names(self, obj):
        names = []
        for user in obj.kayaara_reps.all():
            full_name = f"{user.first_name} {user.last_name}".strip()
            names.append(full_name or user.username)
        return names


class MeetingAgendaSerializer(serializers.ModelSerializer):
    items = MeetingAgendaItemSerializer(many=True)

    class Meta:
        model = MeetingAgenda
        fields = [
            'id',
            'client',
            'visit_date',
            'items',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        agenda = MeetingAgenda.objects.create(**validated_data)

        for index, item in enumerate(items_data):
            item_order = item.pop('order', None) or index + 1
            kayaara_reps = item.pop('kayaara_reps', [])
            agenda_item = MeetingAgendaItem.objects.create(agenda=agenda, order=item_order, **item)
            if kayaara_reps:
                agenda_item.kayaara_reps.set(kayaara_reps)

        return agenda

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)

        if items_data is not None:
            instance.items.all().delete()
            for index, item in enumerate(items_data):
                item_order = item.pop('order', None) or index + 1
                kayaara_reps = item.pop('kayaara_reps', [])
                agenda_item = MeetingAgendaItem.objects.create(agenda=instance, order=item_order, **item)
                if kayaara_reps:
                    agenda_item.kayaara_reps.set(kayaara_reps)

        return instance


class MeetingAgendaLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingAgendaLog
        fields = [
            'id',
            'client',
            'source_agenda',
            'visit_date',
            'items',
            'created_by',
            'created_at',
        ]
        read_only_fields = fields

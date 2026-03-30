from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import VisitAgenda, VisitAgendaItem, VisitAgendaLog

User = get_user_model()


class VisitAgendaItemSerializer(serializers.ModelSerializer):
    hqepl_reps = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.filter(is_active=True),
        required=False
    )
    hqepl_rep_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = VisitAgendaItem
        fields = [
            'id',
            'activity',
            'start_time',
            'end_time',
            'output',
            'team_members',
            'hqepl_reps',
            'hqepl_rep_names',
            'prior_tasks',
            'order',
        ]

    def get_hqepl_rep_names(self, obj):
        names = []
        for user in obj.hqepl_reps.all():
            full_name = f"{user.first_name} {user.last_name}".strip()
            names.append(full_name or user.username)
        return names


class VisitAgendaSerializer(serializers.ModelSerializer):
    items = VisitAgendaItemSerializer(many=True)

    class Meta:
        model = VisitAgenda
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
        agenda = VisitAgenda.objects.create(**validated_data)

        for index, item in enumerate(items_data):
            item_order = item.pop('order', None) or index + 1
            hqepl_reps = item.pop('hqepl_reps', [])
            agenda_item = VisitAgendaItem.objects.create(agenda=agenda, order=item_order, **item)
            if hqepl_reps:
                agenda_item.hqepl_reps.set(hqepl_reps)

        return agenda

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)

        if items_data is not None:
            instance.items.all().delete()
            for index, item in enumerate(items_data):
                item_order = item.pop('order', None) or index + 1
                hqepl_reps = item.pop('hqepl_reps', [])
                agenda_item = VisitAgendaItem.objects.create(agenda=instance, order=item_order, **item)
                if hqepl_reps:
                    agenda_item.hqepl_reps.set(hqepl_reps)

        return instance


class VisitAgendaLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitAgendaLog
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

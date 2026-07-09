from datetime import date

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import MeetingAgenda, MeetingAgendaLog
from .serializers import MeetingAgendaSerializer, MeetingAgendaLogSerializer
from clients.models import Client

User = get_user_model()


class MeetingAgendaViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingAgendaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = MeetingAgenda.objects.all()
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset

    def _get_or_create_agenda(self, client_id, user):
        agenda, _ = MeetingAgenda.objects.get_or_create(
            client_id=client_id,
            defaults={
                'visit_date': date.today(),
                'created_by': user,
            }
        )
        return agenda

    @action(detail=False, methods=['get', 'put'], url_path='clients/(?P<client_id>\\d+)')
    def by_client(self, request, client_id):
        agenda = self._get_or_create_agenda(client_id, request.user)

        if request.method == 'GET':
            serializer = self.get_serializer(agenda)
            return Response(serializer.data)

        serializer = self.get_serializer(agenda, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(client_id=client_id, updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='clients/(?P<client_id>\\d+)/finalize')
    def finalize(self, request, client_id):
        agenda = self._get_or_create_agenda(client_id, request.user)

        visit_date = request.data.get('visit_date') or agenda.visit_date or date.today()
        snapshot_items = []
        for item in agenda.items.prefetch_related('kayaara_reps').all():
            rep_ids = list(item.kayaara_reps.values_list('id', flat=True))
            rep_names = []
            for user in item.kayaara_reps.all():
                full_name = f"{user.first_name} {user.last_name}".strip()
                rep_names.append(full_name or user.username)

            snapshot_items.append({
                'order': item.order,
                'activity': item.activity,
                'start_time': item.start_time,
                'end_time': item.end_time,
                'output': item.output,
                'team_members': item.team_members,
                'kayaara_reps': rep_ids,
                'kayaara_rep_names': rep_names,
                'prior_tasks': item.prior_tasks,
            })

        log_entry = MeetingAgendaLog.objects.create(
            client_id=client_id,
            source_agenda=agenda,
            visit_date=visit_date,
            items=snapshot_items,
            created_by=request.user,
        )

        agenda.items.all().delete()
        agenda.visit_date = date.today()
        agenda.updated_by = request.user
        agenda.save(update_fields=['visit_date', 'updated_by', 'updated_at'])

        return Response(MeetingAgendaLogSerializer(log_entry).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='clients/(?P<client_id>\\d+)/logs')
    def logs(self, request, client_id):
        logs = MeetingAgendaLog.objects.filter(client_id=client_id)
        serializer = MeetingAgendaLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='clients/(?P<client_id>\\d+)/logs/(?P<log_id>\\d+)')
    def log_detail(self, request, client_id, log_id):
        log_entry = get_object_or_404(MeetingAgendaLog, id=log_id, client_id=client_id)
        serializer = MeetingAgendaLogSerializer(log_entry)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='clients/(?P<client_id>\\d+)/team')
    def client_team(self, request, client_id):
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        team_members = []

        # 1. KAYAARA users (all active)
        kayaara_users = User.objects.filter(role='KAYAARA', is_active=True)
        for user in kayaara_users:
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": full_name,
                "role": "KAYAARA"
            })

        # 2. SGMs assigned to this client
        for user in client.assigned_sgms.all():
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": full_name,
                "role": "SGM"
            })

        # 3. Internal team (employees)
        for user in client.internal_team.all():
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": full_name,
                "role": "EMPLOYEE"
            })

        return Response(team_members)

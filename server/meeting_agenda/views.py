from datetime import date, datetime

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import MeetingAgenda, MeetingAgendaLog, MeetingSession
from .serializers import MeetingAgendaSerializer, MeetingAgendaLogSerializer, MeetingSessionSerializer
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

    @action(detail=False, methods=['get', 'patch'], url_path='clients/(?P<client_id>\\d+)/logs/(?P<log_id>\\d+)')
    def log_detail(self, request, client_id, log_id):
        log_entry = get_object_or_404(MeetingAgendaLog, id=log_id, client_id=client_id)

        if request.method == 'PATCH':
            serializer = MeetingAgendaLogSerializer(log_entry, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

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

    # ── Meeting Session endpoints ──

    @action(detail=False, methods=['post'], url_path='clients/(?P<client_id>\\d+)/sessions/start')
    def start_session(self, request, client_id):
        try:
            Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        session = MeetingSession.objects.create(
            client_id=client_id,
            created_by=request.user,
        )
        serializer = MeetingSessionSerializer(session)
        data = serializer.data
        data["jitsi_room"] = f"PMS-{client_id}-{session.id}"
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='clients/(?P<client_id>\\d+)/sessions/(?P<session_id>\\d+)')
    def get_session(self, request, client_id, session_id):
        session = get_object_or_404(MeetingSession, id=session_id, client_id=client_id)
        serializer = MeetingSessionSerializer(session)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='clients/(?P<client_id>\\d+)/sessions/(?P<session_id>\\d+)/add-note')
    def add_note(self, request, client_id, session_id):
        session = get_object_or_404(MeetingSession, id=session_id, client_id=client_id, status="ACTIVE")

        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Note text is required."}, status=status.HTTP_400_BAD_REQUEST)

        notes = session.notes or []
        notes.append({
            "timestamp": datetime.now().isoformat(),
            "text": text,
            "author": request.user.username,
        })
        session.notes = notes
        session.save(update_fields=["notes"])

        return Response(MeetingSessionSerializer(session).data)

    @action(detail=False, methods=['post'], url_path='clients/(?P<client_id>\\d+)/sessions/(?P<session_id>\\d+)/end')
    def end_session(self, request, client_id, session_id):
        session = get_object_or_404(MeetingSession, id=session_id, client_id=client_id, status="ACTIVE")

        session.status = "ENDED"
        session.ended_at = timezone.now()
        session.save(update_fields=["status", "ended_at"])

        return Response({
            "session_id": session.id,
            "status": "ENDED",
        })

    @action(detail=False, methods=['post'], url_path='clients/(?P<client_id>\\d+)/upload-mom')
    def upload_mom(self, request, client_id):
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        mom_file = request.FILES.get('mom_file')
        if not mom_file:
            return Response({"error": "mom_file is required"}, status=status.HTTP_400_BAD_REQUEST)

        log_entry = MeetingAgendaLog.objects.create(
            client_id=client_id,
            visit_date=date.today(),
            mom_file=mom_file,
            description=request.data.get('description', ''),
            created_by=request.user,
        )

        serializer = MeetingAgendaLogSerializer(log_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='clients/(?P<client_id>\\d+)/create-manual-mom')
    def create_manual_mom(self, request, client_id):
        try:
            Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        visit_date = request.data.get('visit_date', str(date.today()))
        meeting_start_time = request.data.get('meeting_start_time', request.data.get('start_time', ''))
        meeting_end_time = request.data.get('meeting_end_time', request.data.get('end_time', ''))
        description = request.data.get('description', '')
        items = request.data.get('items', [])

        if not items or not isinstance(items, list) or len(items) == 0:
            return Response({"error": "At least one agenda point is required."}, status=status.HTTP_400_BAD_REQUEST)

        log_entry = MeetingAgendaLog.objects.create(
            client_id=client_id,
            visit_date=visit_date,
            start_time=meeting_start_time,
            end_time=meeting_end_time,
            description=description,
            items=items,
            created_by=request.user,
        )

        serializer = MeetingAgendaLogSerializer(log_entry)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_feed(request):
    """Aggregated live feed for the current user."""
    user = request.user
    feed = []

    # 1. Recent MeetingAgendaLog entries
    mom_qs = MeetingAgendaLog.objects.filter(created_by=user).order_by('-created_at')[:10]
    for m in mom_qs:
        feed.append({
            'type': 'mom',
            'icon': 'file-text',
            'title': 'MOM Uploaded',
            'description': m.description or f'Meeting on {m.visit_date}',
            'timestamp': m.created_at.isoformat(),
            'client_id': m.client_id,
            'log_id': m.id,
        })

    # 2. Recent achievements
    try:
        from achievement.models import Achievement
        for a in Achievement.objects.filter(employee=user).order_by('-created_at')[:10]:
            feed.append({
                'type': 'achievement',
                'icon': 'award',
                'title': a.title,
                'description': a.description,
                'timestamp': a.created_at.isoformat(),
            })
    except Exception:
        pass

    # 3. Recent MCTC entries
    try:
        from mctc.models import MCTCEntry
        for e in MCTCEntry.objects.filter(user=user).order_by('-id')[:10]:
            ts = getattr(e, 'created_at', None)
            if not ts:
                from datetime import datetime as dt
                ts = dt.combine(e.entry_date, dt.min.time())
            feed.append({
                'type': 'mctc',
                'icon': 'calendar',
                'title': f'MCTC: {e.label}',
                'description': f'{e.get_entry_type_display()} on {e.entry_date}',
                'timestamp': ts.isoformat(),
            })
    except Exception:
        pass

    # 4. Recent notifications
    try:
        from notifications.models import Notification
        for n in Notification.objects.filter(recipient=user).order_by('-created_at')[:10]:
            feed.append({
                'type': 'notification',
                'icon': 'bell',
                'title': n.title,
                'description': n.message[:120],
                'timestamp': n.created_at.isoformat(),
            })
    except Exception:
        pass

    feed.sort(key=lambda x: x['timestamp'], reverse=True)
    feed = feed[:30]
    return Response(feed)

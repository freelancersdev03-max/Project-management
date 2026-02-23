from datetime import date

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .models import VisitAgenda
from .serializers import VisitAgendaSerializer
from clients.models import Client

User = get_user_model()


class VisitAgendaViewSet(viewsets.ModelViewSet):
    serializer_class = VisitAgendaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = VisitAgenda.objects.all()
        client_id = self.request.query_params.get('client_id')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset

    @action(detail=False, methods=['get', 'put'], url_path='clients/(?P<client_id>\\d+)')
    def by_client(self, request, client_id):
        agenda, _ = VisitAgenda.objects.get_or_create(
            client_id=client_id,
            defaults={
                'visit_date': date.today(),
                'created_by': request.user,
            }
        )

        if request.method == 'GET':
            serializer = self.get_serializer(agenda)
            return Response(serializer.data)

        serializer = self.get_serializer(agenda, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(client_id=client_id, updated_by=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='clients/(?P<client_id>\\d+)/team')
    def client_team(self, request, client_id):
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

        team_members = []

        # 1. HQEPL users (all active)
        hqepl_users = User.objects.filter(role='HQEPL', is_active=True)
        for user in hqepl_users:
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": f"{full_name} (HQEPL)",
                "role": "HQEPL"
            })

        # 2. SGMs assigned to this client
        for user in client.assigned_sgms.all():
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": f"{full_name} (SGM)",
                "role": "SGM"
            })

        # 3. Internal team (employees)
        for user in client.internal_team.all():
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": f"{full_name} (Employee)",
                "role": "EMPLOYEE"
            })

        # 4. External members
        for ext_member in client.external_members.all():
            user = ext_member.user
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            team_members.append({
                "id": user.id,
                "full_name": f"{full_name} (External)",
                "role": "EXTERNAL"
            })

        return Response(team_members)

from django.db.models import Q
from rest_framework import permissions, viewsets

from clients.models import Client
from employees.models import Employee
from .models import MCTCEntry
from .serializers import MCTCEntrySerializer
from projects.models import Project
from sgm.models import ProjectTeam


class MCTCEntryViewSet(viewsets.ModelViewSet):
    serializer_class = MCTCEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_sgm_scoped_employee_ids(self):
        request_user = self.request.user

        handled_clients = Client.objects.filter(assigned_sgms=request_user).distinct()
        handled_projects = Project.objects.filter(
            Q(assigned_sgm=request_user) | Q(client__assigned_sgms=request_user)
        ).distinct()

        client_internal_team_ids = set(
            handled_clients.values_list("internal_team__id", flat=True)
        )

        project_team_employee_ids = set(
            ProjectTeam.objects.filter(project__in=handled_projects)
            .values_list("internal_members__id", flat=True)
        )

        assigned_employee_ids = set(
            Employee.objects.filter(projects__in=handled_projects)
            .values_list("user_id", flat=True)
        )

        return {
            employee_id
            for employee_id in client_internal_team_ids.union(
                project_team_employee_ids,
                assigned_employee_ids,
            )
            if employee_id is not None
        }

    def get_queryset(self):
        request_user = self.request.user
        queryset = MCTCEntry.objects.filter(user=request_user)

        requested_user = self.request.query_params.get('user')
        if requested_user:
            try:
                requested_user_id = int(requested_user)
            except (TypeError, ValueError):
                return queryset.none()

            if requested_user_id == request_user.id:
                queryset = MCTCEntry.objects.filter(user=request_user)
                requested_user_id = None

            if requested_user_id:
                if request_user.role == 'SGM':
                    scoped_employee_ids = self._get_sgm_scoped_employee_ids()
                    if requested_user_id in scoped_employee_ids:
                        queryset = MCTCEntry.objects.filter(user_id=requested_user_id)
                    else:
                        return queryset.none()
                elif request_user.role == 'HQEPL':
                    can_access_employee = Employee.objects.filter(user_id=requested_user_id).exists()
                    if can_access_employee:
                        queryset = MCTCEntry.objects.filter(user_id=requested_user_id)
                    else:
                        return queryset.none()
                else:
                    return queryset.none()

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if year and month:
            try:
                year_int = int(year)
                month_int = int(month)
                if 1 <= month_int <= 12:
                    queryset = queryset.filter(
                        entry_date__year=year_int,
                        entry_date__month=month_int
                    )
            except (TypeError, ValueError):
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

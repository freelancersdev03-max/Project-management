from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from employees.models import Employee as EmployeeProfile
from projects.models import Project
from sgm.models import ProjectTeam
from .models import Achievement
from .serializers import AchievementSerializer, AchievementTokenUpdateSerializer


class AchievementViewSet(viewsets.ModelViewSet):
    serializer_class = AchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def _get_sgm_team_employee_ids(self, user):
        handled_projects = Project.objects.filter(
            Q(assigned_sgm=user) | Q(client__assigned_sgms=user)
        ).distinct()

        project_team_employee_ids = set(
            ProjectTeam.objects.filter(project__in=handled_projects)
            .values_list("internal_members__id", flat=True)
        )
        assigned_employee_ids = set(
            EmployeeProfile.objects.filter(projects__in=handled_projects)
            .values_list("user_id", flat=True)
        )

        return {
            employee_id
            for employee_id in project_team_employee_ids.union(assigned_employee_ids)
            if employee_id is not None
        }

    def get_queryset(self):
        user = self.request.user
        base_queryset = Achievement.objects.select_related("employee", "assigned_by")

        if user.role in ["ADMIN", "HQEPL", "MLS", "SGM"]:
            return base_queryset

        if user.role == "EMPLOYEE":
            return base_queryset.filter(employee=user)

        return Achievement.objects.none()

    def perform_create(self, serializer):
        user = self.request.user

        if user.role not in ["ADMIN", "HQEPL", "MLS", "SGM"]:
            raise PermissionDenied("You do not have permission to assign achievements.")

        employee = serializer.validated_data.get("employee")

        if user.role == "SGM":
            scoped_employee_ids = self._get_sgm_team_employee_ids(user)
            if employee.id not in scoped_employee_ids:
                raise PermissionDenied(
                    "SGM can assign achievements only to employees in handled projects."
                )

        serializer.save(assigned_by=user)

    def partial_update(self, request, *args, **kwargs):
        if request.user.role != "ADMIN":
            raise PermissionDenied("Only Admin can update achievement token status.")

        instance = self.get_object()
        serializer = AchievementTokenUpdateSerializer(
            instance,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(self.get_serializer(instance).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="toggle-token-shared")
    def toggle_token_shared(self, request, pk=None):
        if request.user.role != "ADMIN":
            raise PermissionDenied("Only Admin can update token shared status.")

        achievement = self.get_object()
        achievement.token_shared = not achievement.token_shared
        achievement.save(update_fields=["token_shared", "updated_at"])

        return Response(self.get_serializer(achievement).data, status=status.HTTP_200_OK)

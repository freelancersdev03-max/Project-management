from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import ProjectTeam
from .serializers import (
    ProjectSerializer,
    EmployeeSerializer,
    ProjectTeamAssignSerializer,
    ClientSerializer  # ✅ add this
)
from .permissions import IsSGM
from projects.models import Project
from clients.models import Client  # ✅ add this
from employees.models import Employee
from django.contrib.auth import get_user_model

User = get_user_model()


# -------------------------------
# 1. Get SGM Assigned Projects
# -------------------------------
class SGMProjectListView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request):
        # Source of truth is client assignment, so admin changes are reflected instantly.
        projects = Project.objects.filter(client__assigned_sgms=request.user).distinct()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)



# -------------------------------
# 2. Get Internal Employees
# -------------------------------
class SGMProjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request, project_id):
        try:
            # Allow access if SGM is assigned to the CLIENT of the project
            project = Project.objects.get(
                id=project_id, 
                client__assigned_sgms=request.user
            )
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found or not assigned to you"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProjectSerializer(project)
        return Response(serializer.data)

    def patch(self, request, project_id):
        try:
            # Allow update if SGM is assigned to the CLIENT
            project = Project.objects.get(
                id=project_id, 
                client__assigned_sgms=request.user
            )
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found or not assigned to you"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeListView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request):
        client_id = request.query_params.get("client_id")
        project_id = request.query_params.get("project_id")

        if client_id:
            client = Client.objects.filter(
                id=client_id,
                assigned_sgms=request.user,
            ).first()
            if not client:
                return Response(
                    {"error": "Client not found or not assigned to you"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # For scoped client requests, source of truth is the admin-selected
            # internal team on that client.
            scoped_employee_ids = set(
                client.internal_team.values_list("id", flat=True)
            )

            # Keep edit flows resilient when a project still has legacy members.
            if project_id:
                project = Project.objects.filter(
                    id=project_id,
                    client=client,
                ).first()
                if project:
                    project_team_employee_ids = set(
                        ProjectTeam.objects.filter(project=project)
                        .values_list("internal_members__id", flat=True)
                    )
                    assigned_employee_ids = set(
                        Employee.objects.filter(projects=project)
                        .values_list("user_id", flat=True)
                    )
                    scoped_employee_ids.update(project_team_employee_ids)
                    scoped_employee_ids.update(assigned_employee_ids)
        else:
            handled_clients = Client.objects.filter(assigned_sgms=request.user).distinct()
            handled_projects = Project.objects.filter(
                Q(assigned_sgm=request.user) | Q(client__assigned_sgms=request.user)
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

            scoped_employee_ids = {
                employee_id
                for employee_id in client_internal_team_ids.union(
                    project_team_employee_ids,
                    assigned_employee_ids,
                )
                if employee_id is not None
            }

        employees = User.objects.filter(
            role=User.EMPLOYEE,
            id__in=scoped_employee_ids,
        ).order_by("first_name", "last_name", "username", "email")
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)


# -------------------------------
# 3. Assign Team to Project
# -------------------------------
class AssignProjectTeamView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def post(self, request, project_id):
        try:
            project = Project.objects.get(
                id=project_id,
                client__assigned_sgms=request.user
            )
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found or not assigned to you"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectTeamAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        internal_ids = serializer.validated_data.get("internal_members")
        if internal_ids is None and "employees" in serializer.validated_data:
            internal_ids = serializer.validated_data.get("employees")
        external_ids = serializer.validated_data.get("external_members")

        team, _ = ProjectTeam.objects.get_or_create(project=project)

        if internal_ids is not None:
            internal_users = User.objects.filter(id__in=internal_ids, role="EMPLOYEE")
            team.internal_members.set(internal_users)
            internal_employee_profiles = Employee.objects.filter(user__in=internal_users)
            project.assigned_employees.set(internal_employee_profiles)

        if external_ids is not None:
            external_users = User.objects.filter(id__in=external_ids, role="EXTERNAL")
            team.external_members.set(external_users)
            project.external_team.set(external_users)

        return Response(
            {"message": "Team assigned successfully"},
            status=status.HTTP_201_CREATED
        )


# -------------------------------
# 4. Get Clients of SGM Projects
# -------------------------------
class SGMClientListView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request):
        # Get clients directly assigned to this SGM
        clients = Client.objects.filter(assigned_sgms=request.user)
        # Serialize and return
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)

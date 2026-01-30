from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

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
from django.contrib.auth import get_user_model

User = get_user_model()


# -------------------------------
# 1. Get SGM Assigned Projects
# -------------------------------
class SGMProjectListView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request):
        projects = Project.objects.filter(assigned_sgm=request.user)
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)


# -------------------------------
# 2. Get Internal Employees
# -------------------------------
class EmployeeListView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request):
        employees = User.objects.filter(role="EMPLOYEE")
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
                assigned_sgm=request.user
            )
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found or not assigned to you"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProjectTeamAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_ids = serializer.validated_data["employees"]

        for emp_id in employee_ids:
            employee = User.objects.get(id=emp_id, role="EMPLOYEE")
            ProjectTeam.objects.get_or_create(
                project=project,
                employee=employee
            )

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
        # Get all projects assigned to SGM
        projects = Project.objects.filter(assigned_sgm=request.user)
        # Get all unique client IDs
        client_ids = projects.values_list('client_id', flat=True).distinct()
        # Get client objects
        clients = Client.objects.filter(id__in=client_ids)
        # Serialize and return
        serializer = ClientSerializer(clients, many=True)
        return Response(serializer.data)

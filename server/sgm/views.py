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
        legacy_ids = serializer.validated_data.get("employees")
        if internal_ids is None:
            internal_ids = legacy_ids or []
        external_ids = serializer.validated_data.get("external_members", [])

        team, _ = ProjectTeam.objects.get_or_create(project=project)

        if internal_ids is not None:
            internal_users = User.objects.filter(id__in=internal_ids, role="EMPLOYEE")
            team.internal_members.set(internal_users)

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

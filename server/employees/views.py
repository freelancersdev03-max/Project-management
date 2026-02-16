from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from employees.models import Employee
from projects.models import Project
from clients.models import Client, ExternalTeam
from projects.serializers import ProjectSerializer
from django.db.models import Count, Q

class EmployeeMyProjectsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role != "EMPLOYEE":
            return Response(
                {"detail": "Only employees can access this"},
                status=403
            )

        # Auto-heal: Ensure profile exists
        employee, created = Employee.objects.get_or_create(user=user)

        projects = Project.objects.filter(
            assigned_employees__user=user,
            client__status="active"
        )

        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)


# -------------------------------
# 2. Get Employee Clients (Assigned Projects Only)
# -------------------------------
class EmployeeClientListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != "EMPLOYEE":
            return Response({"detail": "Forbidden"}, status=403)

        # Get projects assigned to this user
        projects = Project.objects.filter(assigned_employees__user=user)
        
        # Get unique clients from these projects
        client_ids = projects.values_list('client_id', flat=True).distinct()
        
        # Annotate with count of ACTIVE projects assigned to this user
        clients = Client.objects.filter(id__in=client_ids, status="active").annotate(
            project_count=Count(
                'projects',
                filter=Q(projects__assigned_employees__user=user, projects__status='ACTIVE')
            )
        )
        
        # We need a serializer for Client. We can import it or define a simple one.
        # Ideally, import from clients.serializers
        from clients.serializers import ClientListSerializer
        serializer = ClientListSerializer(clients, many=True)
        return Response(serializer.data)


class ExternalClientListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != "EXTERNAL":
            return Response({"detail": "Forbidden"}, status=403)

        client_ids = ExternalTeam.objects.filter(
            user=user,
            credential_access=True,
            status="active",
            client_org__status="active"
        ).values_list("client_org_id", flat=True).distinct()

        clients = Client.objects.filter(id__in=client_ids, status="active").annotate(
            project_count=Count(
                'projects',
                filter=Q(projects__external_team=user, projects__status='ACTIVE')
            )
        )

        from clients.serializers import ClientListSerializer
        serializer = ClientListSerializer(clients, many=True)
        return Response(serializer.data)


# -------------------------------
# 3. Get Single Project Detail (Secure)
# -------------------------------
class EmployeeProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        user = request.user
        if user.role != "EMPLOYEE":
            return Response({"detail": "Forbidden"}, status=403)

        try:
            # Only fetch if user is in the team
            project = Project.objects.get(
                id=project_id,
                assigned_employees__user=user,
                client__status="active"
            )
        except Project.DoesNotExist:
            return Response(
                {"detail": "Project not found or access denied"}, 
                status=404
            )

        # Use the FULL ProjectSerializer to show details
        serializer = ProjectSerializer(project)
        return Response(serializer.data)


class ExternalMyProjectsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != "EXTERNAL":
            return Response({"detail": "Forbidden"}, status=403)

        allowed_client_ids = ExternalTeam.objects.filter(
            user=user,
            credential_access=True,
            status="active",
            client_org__status="active"
        ).values_list("client_org_id", flat=True)

        projects = Project.objects.filter(
            Q(external_team=user) | Q(external_lead=user),
            client_id__in=allowed_client_ids,
            client__status="active"
        ).distinct()

        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Project, ActionTask
from .serializers import ProjectSerializer, ActionTaskSerializer
from .permissions import IsProjectMember


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ---------------------------------
    # QUERYSET — ROLE BASED VISIBILITY
    # ---------------------------------
    def get_queryset(self):
        user = self.request.user

        # ADMIN / HQEPL → All projects
        if user.role in ["ADMIN", "HQEPL"]:
            return Project.objects.all()

        # SGM → Projects of assigned clients
        if user.role == "SGM":
            # return Project.objects.filter(assigned_sgm=user)
            # NEW LOGIC: Any project belonging to a client assigned to this SGM
            return Project.objects.filter(client__assigned_sgms=user).distinct()

        # CLIENT → Only their projects
        if user.role == "CLIENT" and hasattr(user, "client_profile"):
            return Project.objects.filter(client=user.client_profile)

        # EMPLOYEE / EXTERNAL → NO direct access
        return Project.objects.none()

    # ---------------------------------
    # CREATE PROJECT
    # ---------------------------------
    def perform_create(self, serializer):
        user = self.request.user
        client = serializer.validated_data.get("client")

        # 1. ADMIN / HQEPL can create for anyone
        if user.role in ["ADMIN", "HQEPL"]:
             serializer.save(created_by=user)
             return

        # 2. SGM can create IF assigned to the client
        if user.role == "SGM":
            if not client:
                 raise ValidationError({"client": "Client is required."})
            
            if not client.assigned_sgms.filter(id=user.id).exists():
                raise PermissionDenied("You can only create projects for clients assigned to you.")
            
            # Auto-assign the SGM to the project? 
            # User wants to be lead. So yes, assign them if not set?
            # Or just set them as creator. The queryset now covers visibility.
            serializer.save(created_by=user, assigned_sgm=user)
            return

        raise PermissionDenied("You do not have permission to create projects.")

    # ---------------------------------
    # UPDATE PROJECT
    # ---------------------------------
    def perform_update(self, serializer):
        user = self.request.user
        project = self.get_object()

        # ADMIN / HQEPL → Full control
        if user.role in ["ADMIN", "HQEPL"]:
            serializer.save()
            return

        # SGM → Limited control
        if user.role == "SGM":
            # Check if SGM is assigned to the client of this project
            if not project.client.assigned_sgms.filter(id=user.id).exists():
                raise PermissionDenied(
                    "You can only update projects for clients assigned to you."
                )

            # SGM cannot change client
            if 'client' in serializer.validated_data:
                serializer.validated_data.pop('client')
            
            # Allow changing assigned_sgm? Maybe.
            # If they want to reassign to another SGM on the same client.
            # keeping logic simple: allow update.
                
            try:
                serializer.save()
            except Exception as e:
                print(f"DEBUG: Project Save Error: {e}")
                import traceback
                traceback.print_exc()
                raise e
            return

        # CLIENT / EMPLOYEE / EXTERNAL → NO update
        raise PermissionDenied("You do not have permission to update this project.")

    # ---------------------------------
    # DELETE PROJECT
    # ---------------------------------
    def perform_destroy(self, instance):
        user = self.request.user

        if user.role not in ["ADMIN", "HQEPL"]:
            raise PermissionDenied("Only Admin or HQEPL can delete projects.")

        instance.delete()

    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    # Add this action
    @action(detail=False, methods=['get'])
    def count(self, request):
        count = Project.objects.count()
        return Response({'count': count})


class CreateActionTaskView(APIView):
    permission_classes = [IsProjectMember]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        action_plan = project.action_plan

        serializer = ActionTaskSerializer(
            data=request.data,
            context={"request": request}
        )

        if serializer.is_valid():
            assigned_to = serializer.validated_data.get("assigned_to")

            # Check if assigned_to is a member
            internal_users = [e.user for e in project.assigned_employees.all()]
            external_users = list(project.external_team.all())
            project_members = internal_users + external_users
            
            # SGM and Lead are also valid assignees?
            if project.assigned_sgm: project_members.append(project.assigned_sgm)
            if project.external_lead: project_members.append(project.external_lead)

            if assigned_to not in project_members:
                return Response(
                    {"error": "Assigned user is not part of this project."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save(
                action_plan=action_plan,
                assigned_by=request.user
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ListActionTasksView(APIView):
    permission_classes = [IsProjectMember]

    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        tasks = project.action_plan.tasks.all()

        serializer = ActionTaskSerializer(
            tasks,
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)

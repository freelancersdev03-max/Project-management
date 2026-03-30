from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from datetime import timedelta
from django.utils import timezone

from .models import Project, ActionTask, ActionPlan
from .serializers import ProjectSerializer, ActionTaskSerializer, ActionPlanSerializer
from .permissions import IsProjectMember
from django.contrib.auth import get_user_model
from visit_agenda.models import VisitAgenda, VisitAgendaLog
from notifications.models import Notification

User = get_user_model()


def notify_sgm_if_no_actions_on_visit_date(project):
    """
    For each finalized visit date for a client, if there is no action task with
    start_date equal to that visit date, send one SGM notification on the next day.
    """
    if not project or not project.client_id:
        return

    sgm = project.assigned_sgm
    if not sgm:
        return

    yesterday = timezone.localdate() - timedelta(days=1)
    logs = VisitAgendaLog.objects.filter(
        client_id=project.client_id,
        visit_date=yesterday,
    )

    if not logs.exists():
        return

    action_plan, _ = ActionPlan.objects.get_or_create(project=project)

    for log in logs:
        total_actions = ActionTask.objects.filter(
            action_plan=action_plan,
            start_date=log.visit_date,
        ).count()
        visit_agenda_id = log.source_agenda_id if log.source_agenda_id else None

        if total_actions != 0:
            continue

        already_sent = Notification.objects.filter(
            recipient=sgm,
            notification_type=Notification.ACTION_PLAN_NOT_SHARED,
            metadata__project_id=project.id,
            metadata__visit_date=str(log.visit_date),
            metadata__rule='NO_ACTION_START_DATE_EQUALS_VISIT_DATE',
        ).exists()

        if already_sent:
            continue

        Notification.objects.create(
            recipient=sgm,
            notification_type=Notification.ACTION_PLAN_NOT_SHARED,
            title=f"Action Plan Missing - {project.name}",
            message=(
                f"No action items were added for client '{project.client.company_name}' "
                f"with start date {log.visit_date}. Please add action items for this visit date."
            ),
            metadata={
                'project_id': project.id,
                'client_id': project.client_id,
                'visit_agenda_id': visit_agenda_id,
                'visit_log_id': log.id,
                'visit_date': str(log.visit_date),
                'total_actions': 0,
                'rule': 'NO_ACTION_START_DATE_EQUALS_VISIT_DATE',
            },
        )


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

        # EMPLOYEE / EXTERNAL / SENIOR → Projects where they are members
        if user.role in ["EMPLOYEE", "EXTERNAL", "SENIOR"]:
            if user.role == "SENIOR":
                # Seniors see ALL projects of the client(s) they belong to
                from clients.models import ExternalTeam
                client_ids = ExternalTeam.objects.filter(user=user).values_list('client_org_id', flat=True)
                return Project.objects.filter(
                    client_id__in=client_ids
                ).filter(client__status="active").distinct()
            if user.role == "EXTERNAL":
                # External users see only projects they are included in
                return Project.objects.filter(
                    external_team=user
                ).filter(client__status="active").distinct()
            return Project.objects.filter(
                Q(assigned_employees__user=user) |
                Q(external_team=user) |
                Q(assigned_sgm=user) |
                Q(external_lead=user) |
                Q(created_by=user) |
                Q(sgm_team__internal_members=user) |
                Q(sgm_team__external_members=user)
            ).filter(client__status="active").distinct()

        return Project.objects.none()

    # ---------------------------------
    # CREATE PROJECT
    # ---------------------------------
    def perform_create(self, serializer):
        from clients.models import ExternalTeam
        
        user = self.request.user
        client = serializer.validated_data.get("client")

        # 1. ADMIN / HQEPL can create for anyone
        if user.role in ["ADMIN", "HQEPL"]:
             project = serializer.save(created_by=user)
             # Auto-add seniors from client's external team
             seniors = User.objects.filter(
                 role="SENIOR",
                 externalteam__client_org=client
             )
             project.senior_team.set(seniors)
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
            project = serializer.save(created_by=user, assigned_sgm=user)
            # Auto-add seniors from client's external team
            seniors = User.objects.filter(
                 role="SENIOR",
                 externalteam__client_org=client
             )
            project.senior_team.set(seniors)
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

        if user.role not in ["ADMIN", "HQEPL", "SGM"]:
            raise PermissionDenied("Only Admin, HQEPL, or SGM can delete projects.")

        instance.delete()

    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    # Add this action
    @action(detail=False, methods=['get'])
    def count(self, request):
        count = Project.objects.count()
        return Response({'count': count})

    # Get visit agendas for a project
    @action(detail=True, methods=['get'], url_path='visit-agendas')
    def get_visit_agendas(self, request, pk=None):
        project = self.get_object()
        # Get visit agendas for the project's client
        visit_agendas = VisitAgenda.objects.filter(client=project.client).order_by('-visit_date')
        serializer_data = [
            {
                'id': va.id,
                'visit_date': va.visit_date,
                'created_at': va.created_at
            }
            for va in visit_agendas
        ]
        return Response(serializer_data)


class ActionTaskAPIView(APIView):
    permission_classes = [IsProjectMember]

    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)
        notify_sgm_if_no_actions_on_visit_date(project)
        
        # Ensure Action Plan exists (Auto-create)
        action_plan, created = ActionPlan.objects.get_or_create(project=project)

        # Filter Tasks based on Role
        # Filter Tasks based on Role
        # UPDATED: All project members can see all tasks
        tasks = ActionTask.objects.filter(action_plan=action_plan)

        serializer = ActionTaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def post(self, request, project_id):
        # 1. Restrict External Users
        if request.user.role == "EXTERNAL":
            return Response(
                {"detail": "External users cannot create action tasks."},
                status=status.HTTP_403_FORBIDDEN
            )

        project = get_object_or_404(Project, id=project_id)
        
        # Get visit_agenda_id from request
        visit_agenda_id = request.data.get("visit_agenda_id")
        
        # Ensure Action Plan exists or update with visit_agenda
        action_plan, created = ActionPlan.objects.get_or_create(project=project)
        
        # If visit_agenda_id is provided, update it
        visit_agenda = None
        if visit_agenda_id:
            try:
                visit_agenda = VisitAgenda.objects.get(id=visit_agenda_id)
                # Verify visit_agenda belongs to the same client
                if visit_agenda.client_id != project.client_id:
                    return Response(
                        {"error": "Visit Agenda does not belong to the project's client."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                action_plan.visit_agenda = visit_agenda
                action_plan.save()
            except VisitAgenda.DoesNotExist:
                return Response({"error": "Visit Agenda not found."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate Assignee is part of project
        assigned_to_id = request.data.get("assigned_to")
        if assigned_to_id:
            try:
                assigned_to = User.objects.get(id=assigned_to_id)
            except User.DoesNotExist:
                 return Response({"error": "Assigned user not found."}, status=status.HTTP_400_BAD_REQUEST)

            # --- Validation Logic ---
            # Fetch internal users
            internal_users = [e.user for e in project.assigned_employees.all()]
            external_users = list(project.external_team.all())
            project_members = internal_users + external_users
            
            if project.assigned_sgm: project_members.append(project.assigned_sgm)
            if project.external_lead: project_members.append(project.external_lead)
            if project.created_by: project_members.append(project.created_by)

            if assigned_to not in project_members:
                return Response(
                    {"error": "Assigned user is not part of this project."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = ActionTaskSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(
                action_plan=action_plan,
                assigned_by=request.user,
                visit_agenda=visit_agenda,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActionTaskDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, task_id):
        task = get_object_or_404(ActionTask, id=task_id)
        
        # Permission check: Only Assignee or Internal Team (if implemented) can update
        # For now, allowing Assignee to mark complete
        if request.user != task.assigned_to and request.user.role == "EXTERNAL":
             return Response({"detail": "You can only update your own tasks."}, status=status.HTTP_403_FORBIDDEN)

        # Update Logic (e.g. status)
        serializer = ActionTaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActionPlanDownloadView(APIView):
    """Download action plan for a specific visit agenda"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id, visit_agenda_id=None):
        """Download action plan data for a project and optionally a specific visit agenda."""
        
        project = get_object_or_404(Project, id=project_id)
        
        # Get the action plan
        action_plan, _ = ActionPlan.objects.get_or_create(project=project)
        
        # If visit_agenda_id is provided, filter tasks for that visit
        visit_agenda = None
        if visit_agenda_id:
            visit_agenda = get_object_or_404(VisitAgenda, id=visit_agenda_id)
            
            # Verify visit_agenda belongs to the same client
            if visit_agenda.client_id != project.client_id:
                return Response(
                    {"error": "Visit Agenda does not belong to the project's client."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Filter tasks for this visit agenda
            tasks = ActionTask.objects.filter(action_plan=action_plan, visit_agenda=visit_agenda)
        else:
            # Get all tasks for the action plan
            tasks = ActionTask.objects.filter(action_plan=action_plan)
        
        # Serialize and return the data
        serializer = ActionTaskSerializer(tasks, many=True)
        
        data = {
            'project': {
                'id': project.id,
                'name': project.name,
                'client': project.client.company_name if project.client else None
            },
            'visit_agenda': {
                'id': visit_agenda.id,
                'visit_date': str(visit_agenda.visit_date)
            } if visit_agenda else None,
            'tasks': serializer.data,
            'total_tasks': tasks.count(),
            'exported_at': timezone.now().isoformat()
        }
        
        return Response(data)
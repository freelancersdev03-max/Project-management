from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import models
from datetime import timedelta
from django.utils import timezone

from .models import Project, ActionTask, ActionPlan, ProjectMilestone, ProjectTemplate, ProjectTemplateMilestone, ProjectTemplateTask
from .serializers import ProjectSerializer, ActionTaskSerializer, ActionPlanSerializer, ProjectMilestoneSerializer, ProjectTemplateSerializer, ProjectTemplateMilestoneSerializer, ProjectTemplateTaskSerializer, CreateTemplateFromProjectSerializer
from .permissions import IsProjectMember
from django.contrib.auth import get_user_model
from meeting_agenda.models import MeetingAgenda, MeetingAgendaLog
from notifications.models import Notification
from clients.models import Client
from employees.models import Employee

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
    logs = MeetingAgendaLog.objects.filter(
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
        meeting_agenda_id = log.source_agenda_id if log.source_agenda_id else None

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
                'meeting_agenda_id': meeting_agenda_id,
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

        # ADMIN → All projects
        if user.role == "ADMIN":
            queryset = Project.objects.all()
        
        # KAYAARA → Projects of assigned clients only
        elif user.role == "KAYAARA":
            from clients.models import Client
            assigned_clients = Client.objects.filter(assigned_kayaara_users=user).values_list('id', flat=True)
            queryset = Project.objects.filter(client_id__in=assigned_clients).distinct()

        # SGM → Projects of assigned clients
        elif user.role == "SGM":
            # return Project.objects.filter(assigned_sgm=user)
            # NEW LOGIC: Any project belonging to a client assigned to this SGM
            queryset = Project.objects.filter(client__assigned_sgms=user).distinct()

        # CLIENT → Only their projects
        elif user.role == "CLIENT" and hasattr(user, "client_profile"):
            queryset = Project.objects.filter(client=user.client_profile)

        # EMPLOYEE / EXTERNAL / SENIOR → Projects where they are members
        elif user.role in ["EMPLOYEE", "EXTERNAL", "SENIOR"]:
            if user.role == "SENIOR":
                # Seniors see ALL projects of the client(s) they belong to
                from clients.models import ExternalTeam
                client_ids = ExternalTeam.objects.filter(user=user).values_list('client_org_id', flat=True)
                queryset = Project.objects.filter(
                    client_id__in=client_ids
                ).filter(client__status="active").distinct()
            elif user.role == "EXTERNAL":
                # External users see only projects they are included in
                queryset = Project.objects.filter(
                    external_team=user
                ).filter(client__status="active").distinct()
            else:
                queryset = Project.objects.filter(
                    Q(assigned_employees__user=user) |
                    Q(external_team=user) |
                    Q(assigned_sgm=user) |
                    Q(external_lead=user) |
                    Q(created_by=user) |
                    Q(sgm_team__internal_members=user) |
                    Q(sgm_team__external_members=user)
                ).filter(client__status="active").distinct()
        else:
            queryset = Project.objects.none()

        client_id = self.request.query_params.get("client_id")
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        return queryset

    def _log_project_creation(self, request, project):
        try:
            from accounts.models import AuditLog
            creator = request.user
            
            sgm_email = project.assigned_sgm.email if project.assigned_sgm else "None"
            kayaara_email = project.assigned_kayaara.email if project.assigned_kayaara else "None"
            ext_lead_email = project.external_lead.email if project.external_lead else "None"
            
            senior_emails = ", ".join([u.email for u in project.senior_team.all()]) if project.senior_team.exists() else "None"
            ext_team_emails = ", ".join([u.email for u in project.external_team.all()]) if project.external_team.exists() else "None"
            employee_emails = ", ".join([emp.user.email for emp in project.assigned_employees.all()]) if project.assigned_employees.exists() else "None"
            
            details_str = (
                f"Project '{project.name}' was created by {creator.email if creator and creator.is_authenticated else 'System/Unknown'}. "
                f"Assigned SGM: {sgm_email}. "
                f"Assigned KAYAARA: {kayaara_email}. "
                f"External Lead: {ext_lead_email}. "
                f"Seniors: {senior_emails}. "
                f"External Team: {ext_team_emails}. "
                f"Assigned Employees: {employee_emails}."
            )
            AuditLog.log_event(
                action=AuditLog.PROJECT_CREATED,
                request=request,
                user=creator if creator and creator.is_authenticated else None,
                details=details_str,
                status=AuditLog.SUCCESS
            )
        except Exception as log_err:
            print(f"Failed to log project creation audit event: {log_err}")

    # ---------------------------------
    # CREATE PROJECT
    # ---------------------------------
    def perform_create(self, serializer):
        from clients.models import ExternalTeam, Client
        
        user = self.request.user
        client = serializer.validated_data.get("client")
        project = None

        # 1. ADMIN can create for anyone
        if user.role == "ADMIN":
             project = serializer.save(created_by=user)
             # Auto-add seniors from client's external team
             seniors = User.objects.filter(
                 role="SENIOR",
                 externalteam__client_org=client
             )
             project.senior_team.set(seniors)
        
        # 2. KAYAARA can create only for assigned clients
        elif user.role == "KAYAARA":
            if not client:
                raise ValidationError({"client": "Client is required."})
            
            if not client.assigned_kayaara_users.filter(id=user.id).exists():
                raise PermissionDenied("You can only create projects for clients assigned to you.")
            
            project = serializer.save(created_by=user)
            # Auto-add seniors from client's external team
            seniors = User.objects.filter(
                role="SENIOR",
                externalteam__client_org=client
            )
            project.senior_team.set(seniors)

        # 3. SGM can create IF assigned to the client
        elif user.role == "SGM":
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

        else:
            raise PermissionDenied("You do not have permission to create projects.")

        if project:
            self._log_project_creation(self.request, project)

    # ---------------------------------
    # UPDATE PROJECT
    # ---------------------------------
    def perform_update(self, serializer):
        user = self.request.user
        project = self.get_object()

        # ADMIN → Full control
        if user.role == "ADMIN":
            serializer.save()
            return
        
        # KAYAARA → Can update only projects from assigned clients
        if user.role == "KAYAARA":
            if not project.client.assigned_kayaara_users.filter(id=user.id).exists():
                raise PermissionDenied("You can only update projects from clients assigned to you.")
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

        if user.role == "ADMIN":
            instance.delete()
        elif user.role == "KAYAARA":
            if not instance.client.assigned_kayaara_users.filter(id=user.id).exists():
                raise PermissionDenied("You can only delete projects from clients assigned to you.")
            instance.delete()
        elif user.role == "SGM":
            if not instance.client.assigned_sgms.filter(id=user.id).exists():
                raise PermissionDenied("You can only delete projects from clients assigned to you.")
            instance.delete()
        else:
            raise PermissionDenied("Only Admin, KAYAARA, or SGM can delete projects.")

    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    # Add this action
    @action(detail=False, methods=['get'])
    def count(self, request):
        count = Project.objects.count()
        return Response({'count': count})

    # Get meeting agendas for a project
    @action(detail=True, methods=['get'], url_path='meeting-agendas')
    def get_meeting_agendas(self, request, pk=None):
        project = self.get_object()
        # Get meeting agendas for the project's client
        meeting_agendas = MeetingAgenda.objects.filter(client=project.client).order_by('-visit_date')
        serializer_data = [
            {
                'id': va.id,
                'visit_date': va.visit_date,
                'created_at': va.created_at
            }
            for va in meeting_agendas
        ]
        return Response(serializer_data)


def log_action_task_audit(request, action_task, event_type):
    try:
        from accounts.models import AuditLog
        user = request.user
        
        assigner = action_task.assigned_by
        assignee = action_task.assigned_to
        
        assigner_email = assigner.email if assigner else "System"
        assignee_email = assignee.email if assignee else "None"
        
        project_name = action_task.action_plan.project.name if (action_task.action_plan and action_task.action_plan.project) else "Unknown Project"
        
        if event_type == 'created':
            action_choice = AuditLog.TASK_CREATED
            details_str = (
                f"Action Task '{action_task.task[:100]}' (ID: {action_task.id}) was created/assigned by {assigner_email} "
                f"to {assignee_email} in project '{project_name}'."
            )
        else:
            action_choice = AuditLog.TASK_COMPLETED
            details_str = (
                f"Action Task '{action_task.task[:100]}' (ID: {action_task.id}) was marked completed. "
                f"Originally assigned by {assigner_email} to {assignee_email} in project '{project_name}'."
            )
            
        AuditLog.log_event(
            action=action_choice,
            request=request,
            user=user if user and user.is_authenticated else None,
            details=details_str,
            status=AuditLog.SUCCESS
        )
    except Exception as log_err:
        print(f"Failed to log action task event: {log_err}")


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
        
        # Get meeting_agenda_id from request
        meeting_agenda_id = request.data.get("meeting_agenda_id")

        # Ensure Action Plan exists or update with meeting_agenda
        action_plan, created = ActionPlan.objects.get_or_create(project=project)

        # If meeting_agenda_id is provided, update it
        meeting_agenda = None
        if meeting_agenda_id:
            try:
                meeting_agenda = MeetingAgenda.objects.get(id=meeting_agenda_id)
                # Verify meeting_agenda belongs to the same client
                if meeting_agenda.client_id != project.client_id:
                    return Response(
                        {"error": "Meeting Agenda does not belong to the project's client."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                action_plan.meeting_agenda = meeting_agenda
                action_plan.save()
            except MeetingAgenda.DoesNotExist:
                return Response({"error": "Meeting Agenda not found."}, status=status.HTTP_400_BAD_REQUEST)
        
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
            action_task = serializer.save(
                action_plan=action_plan,
                assigned_by=request.user,
                meeting_agenda=meeting_agenda,
            )
            # Log action task creation!
            log_action_task_audit(request, action_task, 'created')
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

        # Pre-save states for completion check
        old_completion = task.completion_date
        old_status = task.status

        # Update Logic (e.g. status)
        serializer = ActionTaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            action_task = serializer.save()
            
            # Check if completed
            is_now_completed = False
            if not old_completion and action_task.completion_date:
                is_now_completed = True
            elif old_status not in ['on_time', 'delay_completion'] and action_task.status in ['on_time', 'delay_completion']:
                is_now_completed = True
                
            if is_now_completed:
                log_action_task_audit(request, action_task, 'completed')
                
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ActionPlanDownloadView(APIView):
    """Download action plan for a specific meeting agenda"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_id, meeting_agenda_id=None):
        """Download action plan data for a project and optionally a specific meeting agenda."""
        
        project = get_object_or_404(Project, id=project_id)
        
        # Get the action plan
        action_plan, _ = ActionPlan.objects.get_or_create(project=project)
        
        # If meeting_agenda_id is provided, filter tasks for that meeting
        meeting_agenda = None
        if meeting_agenda_id:
            meeting_agenda = get_object_or_404(MeetingAgenda, id=meeting_agenda_id)
            
            # Verify meeting_agenda belongs to the same client
            if meeting_agenda.client_id != project.client_id:
                return Response(
                    {"error": "meeting agenda does not belong to the project's client."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Filter tasks for this meeting agenda
            tasks = ActionTask.objects.filter(action_plan=action_plan, meeting_agenda=meeting_agenda)
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
            'meeting_agenda': {
                'id': meeting_agenda.id,
                'visit_date': str(meeting_agenda.visit_date)
            } if meeting_agenda else None,
            'tasks': serializer.data,
            'total_tasks': tasks.count(),
            'exported_at': timezone.now().isoformat()
        }
        
        return Response(data)

class MilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ProjectMilestone.objects.filter(project_id=self.kwargs.get('project_pk'))

    def perform_create(self, serializer):
        project = get_object_or_404(Project, pk=self.kwargs.get('project_pk'))
        serializer.save(project=project)


class ProjectTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing project templates with instantiation."""
    serializer_class = ProjectTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Public templates + user's own private templates
        return ProjectTemplate.objects.filter(
            models.Q(is_public=True) | models.Q(created_by=user)
        ).distinct()

    @action(detail=True, methods=['post'])
    def instantiate(self, request, pk=None):
        """Create a project from this template."""
        template = self.get_object()

        # Required fields from request
        client_id = request.data.get('client')
        assigned_sgm_id = request.data.get('assigned_sgm')
        assigned_kayaara_id = request.data.get('assigned_kayaara')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        project_name = request.data.get('name', template.name)
        internal_team_ids = request.data.get('assigned_employees', [])
        external_team_ids = request.data.get('external_team', [])
        senior_team_ids = request.data.get('senior_team', [])

        if not client_id:
            return Response(
                {'client': 'Client is required to create a project from template.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not start_date:
            return Response(
                {'start_date': 'Start date is required to calculate milestone/task dates.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from clients.models import Client
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return Response(
                {'client': 'Client not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Parse start_date
        from datetime import datetime, timedelta
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'start_date': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        end_date_obj = None
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'end_date': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create the project
        project = Project.objects.create(
            name=project_name,
            description=template.description,
            target=template.target,
            client=client,
            total_budget=template.default_budget,
            budget_unit=template.budget_unit,
            priority=template.default_priority,
            start_date=start_date_obj,
            end_date=end_date_obj,
            status='PLANNING',
            created_by=request.user,
        )

        # Set assigned SGM
        if assigned_sgm_id:
            try:
                project.assigned_sgm = User.objects.get(id=assigned_sgm_id, role='SGM')
                project.save()
            except User.DoesNotExist:
                pass

        # Set assigned KAYAARA
        if assigned_kayaara_id:
            try:
                project.assigned_kayaara = User.objects.get(id=assigned_kayaara_id, role='KAYAARA')
                project.save()
            except User.DoesNotExist:
                pass

        # Set teams
        if internal_team_ids:
            project.assigned_employees.set(Employee.objects.filter(user__id__in=internal_team_ids))
        if external_team_ids:
            project.external_team.set(User.objects.filter(id__in=external_team_ids, role='EXTERNAL'))
        if senior_team_ids:
            project.senior_team.set(User.objects.filter(id__in=senior_team_ids, role='SENIOR'))

        # Create milestones from template
        for tm in template.milestones.all():
            due_date = start_date_obj + timedelta(days=tm.due_date_offset)
            ProjectMilestone.objects.create(
                project=project,
                name=tm.name,
                description=tm.description,
                due_date=due_date,
                status='PENDING',
            )

        # Create tasks from template
        action_plan, _ = ActionPlan.objects.get_or_create(project=project)
        for tt in template.tasks.all():
            task_start = start_date_obj + timedelta(days=tt.start_date_offset)
            task_target = start_date_obj + timedelta(days=tt.target_date_offset)
            ActionTask.objects.create(
                action_plan=action_plan,
                task=tt.task,
                assigned_by=request.user,
                assigned_to=None,  # Role-based assignment happens later
                start_date=task_start,
                target_date=task_target,
                priority=tt.priority,
                flag=tt.flag,
                status='in_progress',
            )

        # Return the created project with full serialization
        serializer = ProjectSerializer(project, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def save_as_template(self, request, pk=None):
        """Create a template from an existing project."""
        project = self.get_object()
        serializer = CreateTemplateFromProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        template = ProjectTemplate.objects.create(
            name=data['name'],
            description=data.get('description', project.description),
            target=project.target,
            default_budget=project.total_budget,
            budget_unit=project.budget_unit,
            default_priority=project.priority,
            estimated_duration_days=None,
            category=data['category'],
            is_public=data['is_public'],
            created_by=request.user,
        )

        # Copy milestones
        if data.get('include_milestones', True):
            for milestone in project.milestones.all():
                offset = 0
                if project.start_date and milestone.due_date:
                    offset = (milestone.due_date - project.start_date).days
                ProjectTemplateMilestone.objects.create(
                    template=template,
                    name=milestone.name,
                    description=milestone.description,
                    due_date_offset=max(0, offset),
                )

        # Copy tasks
        if data.get('include_tasks', True):
            try:
                action_plan = project.action_plan
                for task in action_plan.tasks.all():
                    start_offset = 0
                    target_offset = 1
                    if project.start_date:
                        if task.start_date:
                            start_offset = max(0, (task.start_date - project.start_date).days)
                        if task.target_date:
                            target_offset = max(1, (task.target_date - project.start_date).days)

                    ProjectTemplateTask.objects.create(
                        template=template,
                        task=task.task,
                        assigned_role='',
                        priority=task.priority,
                        flag=task.flag,
                        start_date_offset=start_offset,
                        target_date_offset=target_offset,
                    )
            except ActionPlan.DoesNotExist:
                pass

        out_serializer = ProjectTemplateSerializer(template, context={'request': request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

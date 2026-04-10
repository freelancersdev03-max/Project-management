from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
import tempfile
import os
import math
from datetime import timedelta
from .models import Task
from .serializers import TaskSerializer
from .excel_utils import ExcelTaskImporter
from projects.models import Project, ActionTask
from sgm.models import ProjectTeam
from employees.models import Employee
from clients.models import Client, ExternalTeam
from notifications.models import Notification
from notifications.utils import create_notification

User = get_user_model()

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_display_name(self, user):
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        return full_name or user.username or user.email

    def _can_delete_task(self, user, task):
        source_module = str(task.source_module or '').strip().upper()
        if source_module not in ['', 'DIRECT']:
            return False

        if not task.assigned_by_id:
            return False

        return task.assigned_by_id == user.id

    def _truncate_to_one_decimal(self, value):
        return math.trunc(value * 10) / 10

    def _get_sgm_scoped_team_member_ids(self, user):
        handled_projects = Project.objects.filter(
            Q(assigned_sgm=user) | Q(client__assigned_sgms=user)
        ).distinct()

        handled_project_ids = list(handled_projects.values_list('id', flat=True))
        handled_client_ids = list(
            handled_projects.values_list('client_id', flat=True).distinct()
        )

        project_team_employee_ids = set(
            ProjectTeam.objects.filter(project__in=handled_projects)
            .values_list("internal_members__id", flat=True)
        )
        assigned_employee_ids = set(
            Employee.objects.filter(projects__in=handled_projects)
            .values_list("user_id", flat=True)
        )
        client_internal_ids = set(
            handled_projects.values_list("client__internal_team__id", flat=True)
        )
        project_sgm_ids = set(
            handled_projects.values_list("assigned_sgm_id", flat=True)
        )
        client_sgm_ids = set(
            handled_projects.values_list("client__assigned_sgms__id", flat=True)
        )

        scoped_member_ids = sorted(
            member_id
            for member_id in project_team_employee_ids
            .union(assigned_employee_ids)
            .union(client_internal_ids)
            .union(project_sgm_ids)
            .union(client_sgm_ids)
            .union({user.id})
            if member_id is not None
        )

        return scoped_member_ids, handled_project_ids, handled_client_ids

    def _get_senior_scoped_external_member_ids(self, user):
        client_ids = ExternalTeam.objects.filter(user=user).values_list('client_org_id', flat=True)
        scoped_external_ids = ExternalTeam.objects.filter(
            client_org_id__in=client_ids,
            user__role=User.EXTERNAL,
        ).values_list('user_id', flat=True)

        return {member_id for member_id in scoped_external_ids if member_id is not None}

    def _parse_csv_values(self, value):
        if not value:
            return []
        return [part.strip() for part in str(value).split(',') if part.strip()]

    def _monthly_week_label(self, value_date):
        # Week position of the weekday within current month (First/Second/Third/Fourth/Last)
        day_of_month = value_date.day
        index = (day_of_month - 1) // 7
        label = ['First', 'Second', 'Third', 'Fourth', 'Fifth'][index]

        next_same_weekday = value_date + timedelta(days=7)
        if next_same_weekday.month != value_date.month:
            return 'Last'

        if label == 'Fifth':
            return 'Last'

        return label

    def _matches_repeat_rule_for_date(self, task, value_date):
        if not task.is_repeatable:
            return False

        if task.target_date and value_date < task.target_date:
            return False

        if task.repeat_end_date and value_date > task.repeat_end_date:
            return False

        frequency = (task.repeat_frequency or '').strip()
        if frequency == 'Daily':
            return True

        weekday_name = value_date.strftime('%A')

        if frequency == 'Weekly':
            return weekday_name in self._parse_csv_values(task.repeat_day)

        if frequency == 'Monthly':
            week_labels = self._parse_csv_values(task.repeat_week)
            return self._monthly_week_label(value_date) in week_labels

        return False

    def _ensure_repeat_task_notifications(self, user):
        today = timezone.localdate()
        repeat_tasks = Task.objects.select_related('project', 'client_org').filter(
            assigned_to=user,
            is_repeatable=True,
            target_date__lte=today,
        ).exclude(repeat_end_date__lt=today)

        for task in repeat_tasks:
            if not self._matches_repeat_rule_for_date(task, today):
                continue

            metadata = {
                'task_id': task.id,
                'task_title': task.title,
                'repeat_date': today.isoformat(),
                'repeat_frequency': task.repeat_frequency,
                'is_repeat_reminder': True,
            }

            if task.project_id:
                metadata['project_id'] = task.project_id
                metadata['project_name'] = task.project.name
            if task.client_org_id:
                metadata['client_id'] = task.client_org_id
                metadata['client_name'] = task.client_org.company_name

            if Notification.objects.filter(
                recipient=user,
                notification_type=Notification.REPEAT_TASK_REMINDER,
                metadata__task_id=task.id,
                metadata__repeat_date=today.isoformat(),
            ).exists():
                continue

            context_label = None
            if task.project_id:
                context_label = task.project.name
            elif task.client_org_id:
                context_label = task.client_org.company_name

            if context_label:
                message = f'Repeat task "{task.title}" is scheduled today for {context_label}.'
            else:
                message = f'Repeat task "{task.title}" is scheduled today.'

            create_notification(
                recipient=user,
                notification_type=Notification.REPEAT_TASK_REMINDER,
                title='Repeat task reminder',
                message=message,
                metadata=metadata,
            )

    def get_queryset(self):
        """
        Handles the 3 tables: Returns tasks where user is the receiver or assigner.
        """
        user = self.request.user
        self._ensure_repeat_task_notifications(user)
        assigned_to = self.request.query_params.get('assigned_to')

        if assigned_to and user.role in [User.SGM, User.HQEPL, User.SENIOR, User.MLS]:
            try:
                assigned_to_id = int(assigned_to)
            except (TypeError, ValueError):
                assigned_to_id = None

            if assigned_to_id:
                if user.role in [User.HQEPL, User.MLS]:
                    return Task.objects.filter(assigned_to_id=assigned_to_id).order_by('-id')
                if user.role == User.SENIOR:
                    scoped_external_ids = self._get_senior_scoped_external_member_ids(user)
                    if assigned_to_id not in scoped_external_ids:
                        return Task.objects.none()
                return Task.objects.filter(assigned_to_id=assigned_to_id).order_by('-id')

        queryset = Task.objects.filter(Q(assigned_to=user) | Q(assigned_by=user))

        # For SGM/EMPLOYEE users, hide DDFMS tasks that they delegated to others.
        # They should still see DDFMS steps assigned to themselves.
        if user.role in [User.SGM, User.EMPLOYEE]:
            queryset = queryset.exclude(
                Q(source_module='DDFMS', assigned_by=user) & ~Q(assigned_to=user)
            )

        return queryset.order_by('-id')

    def _resolve_action_plan_target_ids(self, user):
        assigned_to = self.request.query_params.get('assigned_to')

        if assigned_to and user.role in [User.SGM, User.HQEPL, User.SENIOR, User.MLS]:
            try:
                assigned_to_id = int(assigned_to)
            except (TypeError, ValueError):
                return []

            if user.role in [User.HQEPL, User.MLS]:
                return [assigned_to_id]

            if user.role == User.SENIOR:
                scoped_external_ids = self._get_senior_scoped_external_member_ids(user)
                return [assigned_to_id] if assigned_to_id in scoped_external_ids else []

            if user.role == User.SGM:
                scoped_member_ids, _, _ = self._get_sgm_scoped_team_member_ids(user)
                return [assigned_to_id] if assigned_to_id in scoped_member_ids else []

            return []

        return [user.id]

    def _normalize_action_plan_status(self, status_value):
        normalized = str(status_value or '').strip().lower()
        if normalized == 'on_time':
            return 'On Time'
        if normalized == 'delay_completion':
            return 'Delayed'
        if normalized == 'over_due':
            return 'Overdue'
        if normalized in ['completed', 'on time', 'delayed', 'overdue']:
            return normalized.title()
        return 'In Progress'

    def _serialize_action_plan_tasks(self, action_tasks):
        rows = []
        for task in action_tasks:
            project = task.action_plan.project if task.action_plan else None
            client = project.client if project else None
            assigned_to_name = self._get_display_name(task.assigned_to) if task.assigned_to else None
            assigned_by_name = self._get_display_name(task.assigned_by) if task.assigned_by else None

            rows.append({
                'id': f'ap-{task.id}',
                'task_id': f'AP-{task.id}',
                'title': task.task,
                'description': '',
                'project': project.id if project else None,
                'project_name': project.name if project else None,
                'client_org': client.id if client else None,
                'client_name': client.company_name if client else None,
                'assigned_to': task.assigned_to_id,
                'assigned_to_name': assigned_to_name,
                'assigned_by': task.assigned_by_id,
                'assigned_by_name': assigned_by_name,
                'start_date': task.start_date,
                'target_date': task.target_date,
                'completion_date': task.completion_date,
                'status': self._normalize_action_plan_status(task.status),
                'flag': getattr(task, 'flag', None) or 'none',
                'remarks': '',
                'ats_score': None,
                'assigned_file': task.assign_file.url if task.assign_file else None,
                'completion_file': task.completion_file.url if task.completion_file else None,
                'is_repeatable': False,
                'repeat_frequency': None,
                'repeat_end_date': None,
                'repeat_day': None,
                'repeat_week': None,
                'source_module': 'ACTION_PLAN',
                'source_ref_id': task.id,
            })
        return rows

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        regular_tasks = self.get_serializer(queryset, many=True).data

        target_user_ids = self._resolve_action_plan_target_ids(request.user)
        action_plan_tasks = []
        if target_user_ids:
            action_queryset = ActionTask.objects.select_related(
                'action_plan__project__client',
                'assigned_to',
                'assigned_by',
            ).filter(assigned_to_id__in=target_user_ids)
            action_plan_tasks = self._serialize_action_plan_tasks(action_queryset)

        return Response(list(regular_tasks) + action_plan_tasks)

    def perform_create(self, serializer):
        """
        Automatically sets the assigner (Employee, SGM, or Admin).
        """
        serializer.save(assigned_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if not self._can_delete_task(request.user, task):
            return Response(
                {"detail": "You do not have permission to delete this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='weekly-score-data')
    def weekly_score_data(self, request):
        """
        Weekly score dataset with explicit member list + tasks.
        For SGM: includes internal members + SGM names across handled projects/clients, excludes EXTERNAL members.
        """
        user = request.user

        month_param = request.query_params.get('month')
        year_param = request.query_params.get('year')

        try:
            month = int(month_param) if month_param is not None else None
            year = int(year_param) if year_param is not None else None
        except (TypeError, ValueError):
            return Response(
                {"detail": "month and year must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if month is not None and (month < 1 or month > 12):
            return Response(
                {"detail": "month must be between 1 and 12."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if year is not None and (year < 1900 or year > 2100):
            return Response(
                {"detail": "year must be between 1900 and 2100."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.role == User.SGM:
            member_ids, handled_project_ids, handled_client_ids = self._get_sgm_scoped_team_member_ids(user)

            members_queryset = User.objects.filter(
                id__in=member_ids,
                role__in=[User.EMPLOYEE, User.SGM]
            ).order_by('first_name', 'last_name', 'username', 'email')

            scoped_tasks_queryset = Task.objects.filter(
                assigned_to_id__in=member_ids,
                assigned_to__role__in=[User.EMPLOYEE, User.SGM],
            ).filter(
                Q(project_id__in=handled_project_ids) |
                Q(client_org_id__in=handled_client_ids) |
                Q(project_id__isnull=True, client_org_id__isnull=True)
            )

            clients_queryset = Client.objects.filter(
                Q(id__in=handled_client_ids) | Q(assigned_sgms=user)
            ).distinct().order_by('company_name')

            projects_queryset = Project.objects.filter(
                Q(id__in=handled_project_ids) | Q(client__assigned_sgms=user)
            ).select_related('client').distinct().order_by('name')
        elif user.role in [User.ADMIN, User.HQEPL, User.MLS]:
            members_queryset = User.objects.filter(
                role__in=[User.EMPLOYEE, User.SGM, User.HQEPL, User.MLS]
            ).order_by('first_name', 'last_name', 'username', 'email')

            scoped_tasks_queryset = Task.objects.filter(
                assigned_to__role__in=[User.EMPLOYEE, User.SGM, User.HQEPL, User.MLS]
            )

            clients_queryset = Client.objects.all().order_by('company_name')
            projects_queryset = Project.objects.all().select_related('client').order_by('name')
        else:
            scoped_tasks_queryset = self.get_queryset()
            member_ids = scoped_tasks_queryset.values_list('assigned_to_id', flat=True).distinct()
            members_queryset = User.objects.filter(id__in=member_ids).order_by(
                'first_name', 'last_name', 'username', 'email'
            )

            clients_queryset = Client.objects.filter(
                id__in=scoped_tasks_queryset.values_list('client_org_id', flat=True)
            ).distinct().order_by('company_name')

            projects_queryset = Project.objects.filter(
                id__in=scoped_tasks_queryset.values_list('project_id', flat=True)
            ).select_related('client').distinct().order_by('name')

        tasks_queryset = scoped_tasks_queryset

        if year is not None:
            tasks_queryset = tasks_queryset.filter(target_date__year=year)
        if month is not None:
            tasks_queryset = tasks_queryset.filter(target_date__month=month)

        tasks_queryset = tasks_queryset.select_related(
            'assigned_to',
            'assigned_by',
            'project',
            'client_org',
        ).order_by('-id')

        members_data = [
            {
                "id": member.id,
                "name": self._get_display_name(member),
                "email": member.email,
                "role": member.role,
            }
            for member in members_queryset
        ]

        clients_data = [
            {
                "id": client.id,
                "name": client.company_name,
            }
            for client in clients_queryset
        ]

        projects_data = [
            {
                "id": project.id,
                "name": project.name,
                "client_id": project.client_id,
                "client_name": project.client.company_name,
            }
            for project in projects_queryset
        ]

        serialized_tasks = self.get_serializer(tasks_queryset, many=True).data

        # Build SGM-to-employees mapping for role-based UI organization
        sgm_to_employees = {}
        sgm_ids_in_view = set()
        
        for member in members_queryset:
            if member.role == User.SGM:
                sgm_ids_in_view.add(member.id)
                sgm_to_employees[member.id] = []
        
        # For each SGM, find employees in their team
        for sgm_id in sgm_ids_in_view:
            sgm_user = User.objects.get(id=sgm_id)
            # Get team members this SGM manages
            handled_member_ids_set, _, _ = self._get_sgm_scoped_team_member_ids(sgm_user)
            
            # Find employees (not SGMs) in this set who are in the view
            employee_ids_for_sgm = [
                mid for mid in handled_member_ids_set 
                if mid in [m.id for m in members_queryset if m.role == User.EMPLOYEE]
            ]
            sgm_to_employees[sgm_id] = employee_ids_for_sgm

        return Response({
            "members": members_data,
            "tasks": serialized_tasks,
            "clients": clients_data,
            "projects": projects_data,
            "current_user_id": user.id,
            "current_user_role": user.role,
            "sgm_to_employees": sgm_to_employees,
        })

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Calculates OTC and ATS based on handwritten formulas.
        """
        user = request.user
        my_tasks = Task.objects.filter(assigned_to=user)
        
        total = my_tasks.count()
        in_progress = my_tasks.filter(status='In Progress').count()
        on_time_completed = my_tasks.filter(status__in=['On Time', 'Completed']).count()
        delayed_completed = my_tasks.filter(status='Delayed').count()
        overdue = my_tasks.filter(status='Overdue').count()
        
        # OTC Logic from your notes: On-Time Completed / (Total - In-Progress)
        denominator = total - in_progress
        otc_val = 0
        if denominator > 0:
            otc_val = self._truncate_to_one_decimal((on_time_completed / denominator) * 100)

        # ATS Logic: In Progress excluded, On Time=100, Delayed=its ATS%, Overdue=0.
        delayed_ats_sum = my_tasks.filter(status='Delayed').aggregate(total=Sum('ats_score'))['total'] or 0
        ats_numerator = (on_time_completed * 100) + delayed_ats_sum
        ats_val = round((ats_numerator / denominator), 1) if denominator > 0 else 0

        return Response({
            "total_tasks": total,
            "on_time_count": on_time_completed,
            "otc_score": f"{otc_val:.1f}%",
            "ats_score": f"{ats_val:.1f}%",
            "chart_data": [
                {"name": "On Time", "value": on_time_completed, "color": "#22c55e"},
                {"name": "Delayed", "value": delayed_completed, "color": "#facc15"},
                {"name": "Overdue", "value": overdue, "color": "#ef4444"},
            ]
        })

    @action(detail=False, methods=['get'], url_path='company-dashboard-tasks')
    def company_dashboard_tasks(self, request):
        """
        Returns all tasks assigned to Employee + SGM users for company-level dashboard.
        """
        user = request.user

        if user.role not in [User.ADMIN, User.HQEPL, User.MLS]:
            return Response(
                {"detail": "You do not have permission to view company dashboard tasks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        tasks_queryset = (
            Task.objects.filter(assigned_to__role__in=[User.EMPLOYEE, User.SGM])
            .select_related('assigned_to', 'assigned_by', 'project', 'client_org')
            .order_by('-id')
        )

        serialized_tasks = self.get_serializer(tasks_queryset, many=True).data
        return Response(serialized_tasks)

    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser, FormParser))
    def import_tasks_from_excel(self, request):
        """
        Handle bulk task creation from Excel (.xlsx) file upload.
        
        Expected request format:
        - POST /api/tasks/import_tasks_from_excel/
        - Body (multipart/form-data): 'file' key with .xlsx file, optional 'column_mapping' with JSON
        
        Response:
        {
            "success": true/false,
            "tasks_created": int,
            "task_ids": [int, ...],
            "errors": [{"row": int, "message": str}, ...],
            "warnings": [{"row": int, "message": str}, ...]
        }
        """
        try:
            # Debug: Log files and request details
            print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
            print(f"DEBUG: request.POST keys: {list(request.POST.keys())}")
            
            # Get the uploaded file
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                print(f"DEBUG: No file found in request.FILES")
                return Response(
                    {"success": False, "error": "No file provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print(f"DEBUG: File received: {uploaded_file.name}, Size: {uploaded_file.size}")
            
            # Validate file extension
            if not uploaded_file.name.endswith('.xlsx'):
                return Response(
                    {"success": False, "error": "Only .xlsx files are supported"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get column mapping if provided
            column_mapping = None
            if request.POST.get('column_mapping'):
                import json
                try:
                    column_mapping = json.loads(request.POST.get('column_mapping'))
                    print(f"DEBUG: Column mapping provided: {column_mapping}")
                except json.JSONDecodeError:
                    print(f"DEBUG: Invalid column_mapping JSON")
                    return Response(
                        {"success": False, "error": "Invalid column mapping format"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Save to temporary file
            temp_file_path = None
            try:
                # Create temp directory if needed
                import tempfile
                temp_dir = tempfile.gettempdir()
                temp_file_path = os.path.join(temp_dir, uploaded_file.name)
                
                print(f"DEBUG: Saving file to temp: {temp_file_path}")
                
                # Write uploaded file to temp location
                with open(temp_file_path, 'wb+') as temp_file:
                    for chunk in uploaded_file.chunks():
                        temp_file.write(chunk)
                
                print(f"DEBUG: File saved successfully")
                
                # Process Excel file
                importer = ExcelTaskImporter()
                result = importer.import_tasks(
                    temp_file_path,
                    assigned_by=request.user,
                    column_mapping=column_mapping
                )
                
                print(f"DEBUG: Import result: {result}")
                
                # Return result with appropriate status
                response_status = status.HTTP_201_CREATED if result['success'] else status.HTTP_400_BAD_REQUEST
                return Response(result, status=response_status)
                
            finally:
                # Clean up temp file
                if temp_file_path and os.path.exists(temp_file_path):
                    try:
                        os.remove(temp_file_path)
                    except Exception as e:
                        print(f"Warning: Could not delete temp file {temp_file_path}: {str(e)}")
        
        except Exception as e:
            print(f"DEBUG: Exception in import_tasks_from_excel: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {
                    "success": False,
                    "error": f"Server error processing Excel file: {str(e)}"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
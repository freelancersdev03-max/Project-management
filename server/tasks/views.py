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
from .models import Task
from .serializers import TaskSerializer
from .excel_utils import ExcelTaskImporter
from projects.models import Project
from sgm.models import ProjectTeam
from employees.models import Employee
from clients.models import Client

User = get_user_model()

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _get_display_name(self, user):
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        return full_name or user.username or user.email

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

    def get_queryset(self):
        """
        Handles the 3 tables: Returns tasks where user is the receiver or assigner.
        """
        user = self.request.user
        assigned_to = self.request.query_params.get('assigned_to')

        if assigned_to and user.role in [User.SGM, User.HQEPL]:
            try:
                assigned_to_id = int(assigned_to)
            except (TypeError, ValueError):
                assigned_to_id = None

            if assigned_to_id:
                if user.role == User.HQEPL:
                    is_employee = User.objects.filter(id=assigned_to_id, role=User.EMPLOYEE).exists()
                    if not is_employee:
                        return Task.objects.none()
                return Task.objects.filter(assigned_to_id=assigned_to_id).order_by('-id')

        queryset = Task.objects.filter(Q(assigned_to=user) | Q(assigned_by=user))

        # For SGM users, hide DDFMS tasks that were delegated to others.
        # SGM should still see DDFMS steps assigned to themselves.
        if user.role == User.SGM:
            queryset = queryset.exclude(
                Q(source_module='DDFMS', assigned_by=user) & ~Q(assigned_to=user)
            )

        return queryset.order_by('-id')

    def perform_create(self, serializer):
        """
        Automatically sets the assigner (Employee, SGM, or Admin).
        """
        serializer.save(assigned_by=self.request.user)

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

        return Response({
            "members": members_data,
            "tasks": serialized_tasks,
            "clients": clients_data,
            "projects": projects_data,
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

        if user.role not in [User.ADMIN, User.HQEPL]:
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
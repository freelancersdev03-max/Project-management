from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from clients.models import Client
from employees.models import Employee
from projects.models import Project
from sgm.models import ProjectTeam
from .models import RC7Plan
import datetime

class RC7PlanningView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_sgm_scoped_employee_ids(self):
        request_user = self.request.user

        handled_clients = Client.objects.filter(assigned_sgms=request_user).distinct()
        handled_projects = Project.objects.filter(
            Q(assigned_sgm=request_user) | Q(client__assigned_sgms=request_user)
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

        return {
            employee_id
            for employee_id in client_internal_team_ids.union(
                project_team_employee_ids,
                assigned_employee_ids,
            )
            if employee_id is not None
        }

    def get(self, request):
        plan_type = request.query_params.get('type')
        start_date_str = request.query_params.get('start')
        end_date_str = request.query_params.get('end')

        if not all([plan_type, start_date_str, end_date_str]):
            return Response(
                {"error": "Missing required parameters: type, start, end"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
             return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        plans = RC7Plan.objects.filter(
            date__range=[start_date, end_date],
            plan_type=plan_type,
            employee=request.user,
        )

        requested_user = request.query_params.get('user')
        if requested_user:
            try:
                requested_user_id = int(requested_user)
            except (TypeError, ValueError):
                plans = RC7Plan.objects.none()
            else:
                if requested_user_id == request.user.id:
                    plans = RC7Plan.objects.filter(
                        date__range=[start_date, end_date],
                        plan_type=plan_type,
                        employee=request.user,
                    )
                elif request.user.role == 'SGM':
                    scoped_employee_ids = self._get_sgm_scoped_employee_ids()
                    if requested_user_id in scoped_employee_ids:
                        plans = RC7Plan.objects.filter(
                            date__range=[start_date, end_date],
                            plan_type=plan_type,
                            employee_id=requested_user_id,
                        )
                    else:
                        plans = RC7Plan.objects.none()
                elif request.user.role == 'HQEPL':
                    can_access_employee = Employee.objects.filter(user_id=requested_user_id).exists()
                    if can_access_employee:
                        plans = RC7Plan.objects.filter(
                            date__range=[start_date, end_date],
                            plan_type=plan_type,
                            employee_id=requested_user_id,
                        )
                    else:
                        plans = RC7Plan.objects.none()
                else:
                    plans = RC7Plan.objects.none()
        
        # Format the response as expected by frontend: { "employee_id": { "YYYY-MM-DD": { "location": "...", "deliverables": [...] } } }
        response_data = {}
        for plan in plans:
            emp_id = str(plan.employee_id)
            date_key = str(plan.date)
            
            if emp_id not in response_data:
                response_data[emp_id] = {}
                
            response_data[emp_id][date_key] = {
                "location": plan.location,
                "deliverables": [d.strip() for d in plan.deliverable.split('\n') if d.strip()],
                "deliverable": plan.deliverable
            }
            
        return Response(response_data)

    def post(self, request):
        plan_type = request.data.get('type')
        start_date_str = request.data.get('start')
        end_date_str = request.data.get('end')
        plan_data = request.data.get('plan', {})

        if not all([plan_type, start_date_str, end_date_str, plan_data is not None]):
            return Response(
                {"error": "Missing required parameters: type, start, end, plan"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if plan_type not in dict(RC7Plan.PLAN_TYPES):
            return Response(
                {"error": "Invalid plan type. Use sat or wed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_plans = []
        deleted_count = 0
        request_user_id = str(request.user.id)

        for emp_id, emp_plans in plan_data.items():
            if str(emp_id) != request_user_id:
                return Response(
                    {"error": "You can only update your own RC7 plan."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            for date_str, cell_data in emp_plans.items():
                try:
                    date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    continue

                if date_val < start_date or date_val > end_date:
                    continue

                if not isinstance(cell_data, dict):
                    cell_data = {"deliverable": str(cell_data or "")}

                location = str(cell_data.get('location', '') or '').strip()

                raw_deliverables = cell_data.get('deliverables', None)
                if isinstance(raw_deliverables, list):
                    deliverable = '\n'.join(
                        [str(item).strip() for item in raw_deliverables if str(item).strip()]
                    )
                else:
                    deliverable = str(cell_data.get('deliverable', '') or '').strip()

                if location.lower() == 'holiday':
                    deliverable = ''

                has_meaningful_data = bool(location or deliverable)

                if not has_meaningful_data:
                    deleted_count += RC7Plan.objects.filter(
                        employee_id=emp_id,
                        date=date_val,
                        plan_type=plan_type,
                    ).delete()[0]
                    continue

                plan_obj, created = RC7Plan.objects.update_or_create(
                    employee_id=emp_id,
                    date=date_val,
                    plan_type=plan_type,
                    defaults={
                        'location': location,
                        'deliverable': deliverable
                    }
                )
                updated_plans.append(plan_obj)
        
        return Response(
            {
                "message": f"Successfully updated {len(updated_plans)} entries",
                "updated": len(updated_plans),
                "deleted": deleted_count,
            },
            status=status.HTTP_200_OK
        )

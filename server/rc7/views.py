from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from clients.models import Client
from employees.models import Employee
from projects.models import Project
from sgm.models import ProjectTeam
from .models import RC7Plan, RC7Submission
import datetime
import traceback

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
        target_employee_id = request.user.id
        if requested_user:
            try:
                requested_user_id = int(requested_user)
            except (TypeError, ValueError):
                plans = RC7Plan.objects.none()
            else:
                target_employee_id = requested_user_id
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
            
        submission = RC7Submission.objects.filter(
            employee_id=target_employee_id,
            plan_type=plan_type,
            start_date=start_date,
            end_date=end_date
        ).first()
        is_submitted = submission.is_submitted if submission else False
            
        return Response({
            "plans": response_data,
            "is_submitted": is_submitted
        })

    def post(self, request):
        from django.db import transaction
        try:
            user = request.user
            user_id = user.id
            plan_type = request.data.get('type')
            start_date_str = request.data.get('start')
            end_date_str = request.data.get('end')
            plan_data = request.data.get('plan') or {}
            is_submitted = request.data.get('is_submitted')

            if not all([plan_type, start_date_str, end_date_str]):
                return Response(
                    {"error": f"Missing parameters: type={plan_type}, start={start_date_str}, end={end_date_str}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date()
                end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError) as e:
                return Response(
                    {"error": f"Invalid date format: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            updated_count = 0
            deleted_count = 0
            
            with transaction.atomic():
                # Process RC7Plan records
                # Ensure plan_data is handled safely
                if isinstance(plan_data, dict):
                    # We only care about the entry for this user.
                    user_plans = plan_data.get(str(user_id))
                    if not user_plans:
                        # Fallback for flat structure
                        first_key = next(iter(plan_data.keys()), None)
                        try:
                            if first_key:
                                datetime.datetime.strptime(first_key, '%Y-%m-%d')
                                user_plans = plan_data
                        except (ValueError, TypeError):
                            pass

                    if user_plans and isinstance(user_plans, dict):
                        for date_str, cell_data in user_plans.items():
                            try:
                                date_val = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                            except (ValueError, TypeError):
                                continue

                            if date_val < start_date or date_val > end_date:
                                continue

                            if not isinstance(cell_data, dict):
                                location = ""
                                deliverable = str(cell_data or "").strip()
                            else:
                                location = str(cell_data.get('location', '') or '').strip()
                                raw_deliverables = cell_data.get('deliverables')
                                if isinstance(raw_deliverables, list):
                                    deliverable = '\n'.join([str(d).strip() for d in raw_deliverables if str(d).strip()])
                                else:
                                    deliverable = str(cell_data.get('deliverable', '') or '').strip()

                            if location.lower() == 'holiday':
                                deliverable = ''

                            if not location and not deliverable:
                                # Clean up
                                deleted_count += RC7Plan.objects.filter(
                                    employee=user,
                                    date=date_val,
                                    plan_type=plan_type,
                                ).delete()[0]
                            else:
                                # Manual update_or_create for extreme stability
                                plan_obj = RC7Plan.objects.filter(
                                    employee=user,
                                    date=date_val,
                                    plan_type=plan_type
                                ).first()
                                if plan_obj:
                                    plan_obj.location = location
                                    plan_obj.deliverable = deliverable
                                    plan_obj.save()
                                else:
                                    RC7Plan.objects.create(
                                        employee=user,
                                        date=date_val,
                                        plan_type=plan_type,
                                        location=location,
                                        deliverable=deliverable
                                    )
                                updated_count += 1
                
                # Handle Submission
                if is_submitted is not None:
                    submission = RC7Submission.objects.filter(
                        employee=user,
                        plan_type=plan_type,
                        start_date=start_date,
                        end_date=end_date
                    ).first()
                    if submission:
                        submission.is_submitted = bool(is_submitted)
                        submission.save()
                    else:
                        RC7Submission.objects.create(
                            employee=user,
                            plan_type=plan_type,
                            start_date=start_date,
                            end_date=end_date,
                            is_submitted=bool(is_submitted)
                        )

            return Response({
                "message": "Success",
                "updated": updated_count,
                "deleted": deleted_count,
                "user_id": user_id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            err_trace = traceback.format_exc()
            print(f"BEYOND CRITICAL RC7 ERROR: {str(e)}\n{err_trace}")
            return Response(
                {"error": str(e), "traceback": err_trace, "type": str(type(e))},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

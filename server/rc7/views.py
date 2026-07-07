from django.db.models import Q
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from clients.models import Client
from employees.models import Employee
from projects.models import Project
from sgm.models import ProjectTeam
from mctc.models import MCTCEntry
from .models import RC7Plan, RC7Submission
import datetime
import traceback

RC7_TOMBSTONE_PREFIX = '__RC7_TOMBSTONE__:'
RC7_MCTC_LABEL_PREFIX = '__RC7_SYNC__:'


def _collect_visible_rc7_labels_for_dates(employee, dates):
    labels_by_date = {}
    plans = RC7Plan.objects.filter(
        employee=employee,
        date__in=dates,
    ).order_by('date', 'plan_type', 'updated_at', 'id')

    for plan in plans:
        visible_lines, _ = _split_rc7_visible_and_tombstones(plan.deliverable)
        if not visible_lines:
            continue

        date_key = plan.date
        if date_key not in labels_by_date:
            labels_by_date[date_key] = []

        seen = set(labels_by_date[date_key])
        for line in visible_lines:
            if line not in seen:
                labels_by_date[date_key].append(line)
                seen.add(line)

    return labels_by_date


def _sync_rc7_mctc_entries(employee, dates):
    normalized_dates = {date_val for date_val in dates if date_val}
    if not normalized_dates:
        return

    labels_by_date = _collect_visible_rc7_labels_for_dates(employee, normalized_dates)
    MCTCEntry.objects.filter(
        user=employee,
        label__startswith=RC7_MCTC_LABEL_PREFIX,
        entry_date__in=normalized_dates,
    ).delete()

    entries_to_create = []
    for date_val in sorted(normalized_dates):
        for label in labels_by_date.get(date_val, []):
            entries_to_create.append(
                MCTCEntry(
                    user=employee,
                    entry_date=date_val,
                    label=f'{RC7_MCTC_LABEL_PREFIX}{label}',
                    entry_type=MCTCEntry.TYPE_TASK,
                )
            )

    if entries_to_create:
        MCTCEntry.objects.bulk_create(entries_to_create)


def _split_rc7_visible_and_tombstones(deliverable_text):
    visible_lines = []
    tombstones = []

    for raw_line in str(deliverable_text or '').split('\n'):
        line = str(raw_line or '').strip()
        if not line:
                        continue

        if line.startswith(RC7_TOMBSTONE_PREFIX):
            tombstone = line[len(RC7_TOMBSTONE_PREFIX):].strip()
            if tombstone and tombstone not in tombstones:
                tombstones.append(tombstone)
            continue

        visible_lines.append(line)

    return visible_lines, tombstones

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
                elif request.user.role == 'KAYAARA':
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
            deliverable_items, tombstones = _split_rc7_visible_and_tombstones(plan.deliverable)
            raw_step_hours = plan.deliverable_hours or []

            if isinstance(raw_step_hours, list):
                step_hours = []
                for value in raw_step_hours:
                    try:
                        parsed_value = float(value)
                    except (TypeError, ValueError):
                        parsed_value = 0
                    step_hours.append(max(0.0, round(parsed_value, 2)))
            else:
                step_hours = []

            # Backward compatibility: old rows may only have one aggregated estimated_hours value.
            if not step_hours and float(plan.estimated_hours or 0) > 0 and deliverable_items:
                step_hours = [round(float(plan.estimated_hours), 2)]

            if len(step_hours) < len(deliverable_items):
                step_hours.extend([0.0] * (len(deliverable_items) - len(step_hours)))
            elif len(step_hours) > len(deliverable_items):
                step_hours = step_hours[:len(deliverable_items)]
            
            if emp_id not in response_data:
                response_data[emp_id] = {}
                
            response_data[emp_id][date_key] = {
                "location": plan.location,
                "deliverables": deliverable_items,
                "tombstones": tombstones,
                "deliverable": plan.deliverable,
                "deliverable_hours": step_hours,
                "estimated_hours": float(plan.estimated_hours or 0),
                "updated_at": plan.updated_at.isoformat() if plan.updated_at else None
            }
            
        submission = RC7Submission.objects.filter(
            employee_id=target_employee_id,
            plan_type=plan_type,
            start_date=start_date,
            end_date=end_date
        ).first()
        is_submitted = submission.is_submitted if submission else False
        submitted_at = submission.submitted_at.isoformat() if submission and submission.submitted_at else None
            
        return Response({
            "plans": response_data,
            "is_submitted": is_submitted,
            "submitted_at": submitted_at
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
            affected_dates = set()

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

                            affected_dates.add(date_val)

                            if not isinstance(cell_data, dict):
                                location = ""
                                deliverable = str(cell_data or "").strip()
                                deliverable_hours = []
                                estimated_hours = 0
                                tombstones = []
                            else:
                                location = str(cell_data.get('location', '') or '').strip()
                                raw_deliverables = cell_data.get('deliverables')
                                raw_tombstones = cell_data.get('tombstones')
                                tombstones = []

                                if isinstance(raw_tombstones, list):
                                    for value in raw_tombstones:
                                        tombstone = str(value or '').strip()
                                        if tombstone and tombstone not in tombstones:
                                            tombstones.append(tombstone)

                                if isinstance(raw_deliverables, list):
                                    visible_deliverables = []
                                    for item in raw_deliverables:
                                        text = str(item).strip()
                                        if not text:
                                            continue
                                        if text.startswith(RC7_TOMBSTONE_PREFIX):
                                            tombstone = text[len(RC7_TOMBSTONE_PREFIX):].strip()
                                            if tombstone and tombstone not in tombstones:
                                                tombstones.append(tombstone)
                                            continue
                                        visible_deliverables.append(text)
                                    deliverable = '\n'.join(visible_deliverables)
                                else:
                                    deliverable = str(cell_data.get('deliverable', '') or '').strip()
                                    visible_deliverables = []
                                    for line in deliverable.split('\n'):
                                        text = str(line or '').strip()
                                        if not text:
                                            continue
                                        if text.startswith(RC7_TOMBSTONE_PREFIX):
                                            tombstone = text[len(RC7_TOMBSTONE_PREFIX):].strip()
                                            if tombstone and tombstone not in tombstones:
                                                tombstones.append(tombstone)
                                            continue
                                        visible_deliverables.append(text)
                                    deliverable = '\n'.join(visible_deliverables)

                                raw_hours = cell_data.get('deliverable_hours')
                                if isinstance(raw_hours, list):
                                    deliverable_hours = []
                                    for value in raw_hours:
                                        try:
                                            parsed_value = float(value)
                                        except (TypeError, ValueError):
                                            parsed_value = 0
                                        deliverable_hours.append(max(0.0, round(parsed_value, 2)))
                                else:
                                    deliverable_hours = []

                                # Legacy fallback: older clients send one overall estimated_hours value.
                                if not deliverable_hours:
                                    try:
                                        legacy_hours = float(cell_data.get('estimated_hours', 0) or 0)
                                    except (TypeError, ValueError):
                                        legacy_hours = 0
                                    if legacy_hours > 0:
                                        deliverable_hours = [round(legacy_hours, 2)]

                                deliverable_lines = [d.strip() for d in deliverable.split('\n') if d.strip()]
                                if len(deliverable_hours) < len(deliverable_lines):
                                    deliverable_hours.extend([0.0] * (len(deliverable_lines) - len(deliverable_hours)))
                                elif len(deliverable_hours) > len(deliverable_lines):
                                    deliverable_hours = deliverable_hours[:len(deliverable_lines)]

                                estimated_hours = round(sum(deliverable_hours), 2)

                            if location.lower() == 'holiday':
                                deliverable = ''
                                deliverable_hours = []
                                estimated_hours = 0

                            if not location and not deliverable:
                                # Persist an explicit empty row as a tombstone so MCTC prefill
                                # does not re-add user-deleted deliverables on next load.
                                plan_obj = RC7Plan.objects.filter(
                                    employee=user,
                                    date=date_val,
                                    plan_type=plan_type,
                                ).first()
                                if plan_obj:
                                    plan_obj.location = ''
                                    plan_obj.deliverable = ''
                                    plan_obj.deliverable_hours = []
                                    plan_obj.estimated_hours = 0
                                    plan_obj.save()
                                else:
                                    RC7Plan.objects.create(
                                        employee=user,
                                        date=date_val,
                                        plan_type=plan_type,
                                        location='',
                                        deliverable='',
                                        deliverable_hours=[],
                                        estimated_hours=0,
                                    )
                                updated_count += 1
                            else:
                                if tombstones:
                                    hidden_lines = [f"{RC7_TOMBSTONE_PREFIX}{item}" for item in tombstones]
                                    if deliverable:
                                        deliverable = '\n'.join([deliverable, *hidden_lines])
                                    else:
                                        deliverable = '\n'.join(hidden_lines)

                                # Manual update_or_create for extreme stability
                                plan_obj = RC7Plan.objects.filter(
                                    employee=user,
                                    date=date_val,
                                    plan_type=plan_type
                                ).first()
                                if plan_obj:
                                    plan_obj.location = location
                                    plan_obj.deliverable = deliverable
                                    plan_obj.deliverable_hours = deliverable_hours
                                    plan_obj.estimated_hours = estimated_hours
                                    plan_obj.save()
                                else:
                                    RC7Plan.objects.create(
                                        employee=user,
                                        date=date_val,
                                        plan_type=plan_type,
                                        location=location,
                                        deliverable=deliverable,
                                        deliverable_hours=deliverable_hours,
                                        estimated_hours=estimated_hours,
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

                submission = RC7Submission.objects.filter(
                    employee=user,
                    plan_type=plan_type,
                    start_date=start_date,
                    end_date=end_date
                ).first()

                _sync_rc7_mctc_entries(user, affected_dates)

            return Response({
                "message": "Success",
                "updated": updated_count,
                "deleted": deleted_count,
                "user_id": user_id,
                "submitted_at": submission.submitted_at.isoformat() if submission and submission.submitted_at else None,
                "is_submitted": submission.is_submitted if submission else False,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback
            err_trace = traceback.format_exc()
            print(f"BEYOND CRITICAL RC7 ERROR: {str(e)}\n{err_trace}")
            return Response(
                {"error": str(e), "traceback": err_trace, "type": str(type(e))},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

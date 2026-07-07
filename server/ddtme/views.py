from datetime import timedelta

from rest_framework import viewsets, permissions
from django.db import models
from .models import BigTask
from .serializers import BigTaskSerializer

class BigTaskViewSet(viewsets.ModelViewSet):
    serializer_class = BigTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = BigTask.objects.all()
        project_id = self.request.query_params.get('project_id')
        client_id = self.request.query_params.get('client_id')

        if project_id and project_id != 'undefined':
            try:
                # Ensure project_id is an integer to avoid 500 error
                project_id_int = int(project_id)
                queryset = queryset.filter(project_id=project_id_int)
            except ValueError:
                # If project_id is not a valid integer, return empty or ignore
                return BigTask.objects.none()
        
        if client_id and client_id != 'undefined':
            try:
                client_id_int = int(client_id)
                queryset = queryset.filter(project__client__id=client_id_int)
            except ValueError:
                return BigTask.objects.none()

        # Monthly Filtering
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if not _reviewer_can_view_ddtme_payload(self.request, client_id, month, year):
            return queryset.none()

        if month and year:
            try:
                import calendar
                from datetime import date
                m = int(month)
                y = int(year)
                # Last day of the month
                _, last_day = calendar.monthrange(y, m)
                month_start = date(y, m, 1)
                month_end = date(y, m, last_day)

                # DEBUG LOG
                try:
                    with open('debug_view.log', 'a') as f:
                        f.write(f"\n--- Request: m={m}, y={y} ---\n")
                        f.write(f"Filter: Start <= {month_end} AND Target >= {month_start}\n")
                        count_before = queryset.count()
                        f.write(f"Total Tasks Before Filter: {count_before}\n")
                        
                        # Check each task manually for debug
                        for t in queryset:
                            start_cond = t.start_date <= month_end
                            target_cond = t.target_date >= month_start
                            f.write(f"Task {t.id} '{t.title}': {t.start_date} to {t.target_date}. Overlaps? {start_cond and target_cond}\n")

                except Exception as e:
                    pass

                # Filter: Task overlaps with the month.
                # Keep compatibility with legacy rows where one side of the date
                # range may be missing by falling back to the available side.
                queryset = queryset.filter(
                    models.Q(start_date__lte=month_end, target_date__gte=month_start)
                    | models.Q(start_date__isnull=True, target_date__range=(month_start, month_end))
                    | models.Q(target_date__isnull=True, start_date__range=(month_start, month_end))
                    | models.Q(start_date__isnull=True, target_date__isnull=True, created_at__date__range=(month_start, month_end + timedelta(days=1)))
                )
            except (ValueError, TypeError):
                pass # Ignore invalid month/year
        
        # DEBUG LOGGING FOR BIG TASKS
        import logging
        logging.basicConfig(filename='debug_bigtasks.log', level=logging.INFO)
        logging.info(f"User: {self.request.user} | ClientID: {client_id} | Month: {month} | Year: {year} | Count: {queryset.count()}")

        return queryset

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating BigTask: {e}")
            from rest_framework.response import Response
            from rest_framework import status
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


from .models import DDTMESubmission, DDTMEAdditionalTask, ManDayEntry, DDTMEMonthlyObjective
from .serializers import DDTMESubmissionSerializer, DDTMEAdditionalTaskSerializer, ManDayEntrySerializer, DDTMEMonthlyObjectiveSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from employees.models import Employee
from decimal import Decimal, InvalidOperation

User = get_user_model()


def _reviewer_can_view_ddtme_payload(request, client_id, month, year):
    role = str(getattr(request.user, 'role', '') or '').upper()
    view_context = str(request.query_params.get('view', '') or '').strip().lower()

    if view_context == 'mandays':
        return True

    # SGM can access draft payloads to collaborate on editing.
    # Keep KAYAARA gated to submitted/approved/rejected periods.
    if role != 'KAYAARA':
        return True

    # Allow base listing requests (used by DDFMS to discover approved periods).
    if not (client_id and month and year):
        return True

    return DDTMESubmission.objects.filter(
        client_id=client_id,
        month=month,
        year=year,
        status__in=['Submitted', 'Approved', 'Rejected']
    ).exists()

class DDTMESubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = DDTMESubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DDTMESubmission.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if not _reviewer_can_view_ddtme_payload(self.request, client_id, month, year):
            return queryset.none()

        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        
        # DEBUG LOGGING FOR SUBMISSIONS
        import logging
        logging.basicConfig(filename='debug_submissions.log', level=logging.INFO)
        logging.info(f"SubReq: User={self.request.user} | Role={getattr(self.request.user, 'role', 'N/A')} | CID={client_id} | M={month} | Y={year} | Count={queryset.count()}")
        if queryset.exists():
            logging.info(f"Sub Found: {queryset.first()}")

        return queryset

    @action(detail=False, methods=['post'])
    def submit(self, request):
        client_id = request.data.get('client_id')
        month = request.data.get('month')
        year = request.data.get('year')
        
        if not (client_id and month and year):
            return Response({"error": "Missing client_id, month, or year"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client_id = int(client_id)
            month = int(month)
            year = int(year)
        except (TypeError, ValueError):
            return Response({"error": "client_id, month, and year must be valid integers"}, status=status.HTTP_400_BAD_REQUEST)

        objectives = DDTMEMonthlyObjective.objects.filter(
            client_id=client_id,
            month=month,
            year=year
        ).values_list('objective', flat=True)

        has_monthly_major_objective = any(
            str(objective_text or '').strip() for objective_text in objectives
        )

        if not has_monthly_major_objective:
            return Response(
                {"error": "Add atleast 1 Monthly Major Objectives and then only send for approval."},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission, created = DDTMESubmission.objects.get_or_create(
            client_id=client_id, month=month, year=year
        )
        
        submission.status = 'Submitted'
        submission.submitted_by = request.user
        submission.save()
        
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        submission = get_object_or_404(DDTMESubmission, pk=pk)
        # Ensure user can approve (SGM or Admin) - assuming permission check is handled elsewhere or minimally here
        # user_role = request.user.role # Simplified check
        
        submission.status = 'Approved'
        submission.approved_by = request.user
        submission.save()
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        submission = get_object_or_404(DDTMESubmission, pk=pk)
        remarks = request.data.get('remarks', '')
        
        submission.status = 'Rejected'
        submission.remarks = remarks
        submission.save()
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'])
    def allow_edit(self, request, pk=None):
        submission = get_object_or_404(DDTMESubmission, pk=pk)

        submission.status = 'Draft'
        submission.approved_by = None
        submission.save()

        return Response(self.get_serializer(submission).data)


class DDTMEMonthlyObjectiveViewSet(viewsets.ModelViewSet):
    serializer_class = DDTMEMonthlyObjectiveSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DDTMEMonthlyObjective.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if not _reviewer_can_view_ddtme_payload(self.request, client_id, month, year):
            return queryset.none()

        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
            
        return queryset.order_by('created_at')


class DDTMEAdditionalTaskViewSet(viewsets.ModelViewSet):
    serializer_class = DDTMEAdditionalTaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = DDTMEAdditionalTask.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if month:
            queryset = queryset.filter(month=month)
        if year:
            queryset = queryset.filter(year=year)
        return queryset

    # ---- Excel Upload Actions ----

    @action(detail=False, methods=['post'], url_path='upload_excel_headers')
    def upload_excel_headers(self, request):
        """
        Step 1: Accept an uploaded .xlsx file and return its column headers
        along with a preview of the first few rows.
        The frontend uses this to let the user map Excel columns to DDTME fields.
        """
        from .ddtme_excel_utils import DDTMEExcelImporter

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        name = file.name.lower()
        if not (name.endswith('.xlsx') or name.endswith('.xls')):
            return Response({'error': 'Only .xlsx or .xls files are supported'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            headers = DDTMEExcelImporter.read_headers(file)
            file.seek(0)
            preview = DDTMEExcelImporter.read_preview_rows(file, max_rows=5)
            return Response({
                'headers': headers,
                'preview': preview,
            }, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='upload_excel_import')
    def upload_excel_import(self, request):
        """
        Step 2: Accept the uploaded .xlsx again along with the column mapping
        and import rows as DDTMEAdditionalTask entries.

        Expected POST data (multipart/form-data):
            file:           .xlsx file
            client_id:      int
            month:          int (1-12)
            year:           int
            column_mapping: JSON string e.g. {"deliverable":"Task Name","project":"Project"}
        """
        from .ddtme_excel_utils import DDTMEExcelImporter
        import json

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        client_id = request.data.get('client_id')
        month = request.data.get('month')
        year = request.data.get('year')
        mapping_raw = request.data.get('column_mapping', '{}')

        if not (client_id and month and year):
            return Response({'error': 'client_id, month, and year are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            column_mapping = json.loads(mapping_raw) if isinstance(mapping_raw, str) else mapping_raw
        except (json.JSONDecodeError, TypeError):
            return Response({'error': 'Invalid column_mapping JSON'}, status=status.HTTP_400_BAD_REQUEST)

        if not column_mapping.get('deliverable'):
            return Response({'error': 'Deliverable column mapping is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = DDTMEExcelImporter.import_rows(file, column_mapping, client_id, month, year)
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)




class ManDayEntryViewSet(viewsets.ModelViewSet):
    serializer_class = ManDayEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ManDayEntry.objects.all()
    pagination_class = None

    @action(detail=False, methods=['get'])
    def summary(self, request):
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        employee_id = request.query_params.get('employee_id')
        client_id = request.query_params.get('client_id')

        if not month or not year:
            return Response({"error": "Missing month or year"}, status=status.HTTP_400_BAD_REQUEST)

        if not _reviewer_can_view_ddtme_payload(request, client_id, month, year):
            return Response({"clients": [], "employees": []}, status=status.HTTP_200_OK)

        try:
            m = int(month)
            y = int(year)
        except (ValueError, TypeError):
            return Response({"error": "Invalid month or year"}, status=status.HTTP_400_BAD_REQUEST)

        # ----------------------------------------------------------------
        # Step 1: Collect approved client IDs with a flat, separate query
        # ----------------------------------------------------------------
        from clients.models import Client
        approved_submissions = DDTMESubmission.objects.filter(
            month=m, year=y, status='Approved',
        ).select_related('client')

        user_role = str(getattr(request.user, 'role', '') or '').upper()
        if user_role == 'SGM':
            approved_submissions = approved_submissions.filter(
                client__assigned_sgms=request.user
            )

        approved_client_ids = set()
        client_name_map = {}
        for sub in approved_submissions:
            approved_client_ids.add(sub.client_id)
            client_name_map[str(sub.client_id)] = sub.client.company_name if sub.client else f'Client {sub.client_id}'

        print(f"\n[Mandays Summary] === DEBUG START for month={m}, year={y} ===")
        print(f"[Mandays Summary] Approved client IDs: {sorted(approved_client_ids)}")

        if not approved_client_ids:
            print("[Mandays Summary] No approved clients found - returning empty.")
            return Response({"clients": [], "employees": []}, status=status.HTTP_200_OK)

        # ----------------------------------------------------------------
        # Step 2: Collect IDs of tasks that actually belong to this month.
        # ----------------------------------------------------------------
        import calendar
        from datetime import date

        _, last_day = calendar.monthrange(y, m)
        month_start = date(y, m, 1)
        month_end = date(y, m, last_day)

        valid_addtask_ids = set(
            DDTMEAdditionalTask.objects.filter(
                month=m, year=y, client_id__in=approved_client_ids,
            ).values_list('id', flat=True)
        )

        valid_bigtask_ids = set(
            BigTask.objects.filter(
                project__client_id__in=approved_client_ids,
            ).filter(
                models.Q(start_date__lte=month_end, target_date__gte=month_start)
                | models.Q(start_date__isnull=True, target_date__range=(month_start, month_end))
                | models.Q(target_date__isnull=True, start_date__range=(month_start, month_end))
            ).values_list('id', flat=True)
        )

        print(f"[Mandays Summary] Valid AdditionalTask IDs: {len(valid_addtask_ids)}")
        print(f"[Mandays Summary] Valid BigTask IDs: {len(valid_bigtask_ids)}")

        # ----------------------------------------------------------------
        # Step 3: Query ManDayEntry rows for this month/year
        # ----------------------------------------------------------------
        queryset = ManDayEntry.objects.select_related(
            'employee__user',
            'big_task__project__client',
            'additional_task__client',
        ).filter(month=m, year=y)

        queryset = queryset.filter(
            models.Q(big_task_id__in=valid_bigtask_ids)
            | models.Q(additional_task_id__in=valid_addtask_ids)
        )

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        if client_id:
            queryset = queryset.filter(
                models.Q(big_task__project__client__id=client_id)
                | models.Q(additional_task__client_id=client_id)
            )

        # ------------------------------------------------------------------
        # Step 4: Aggregate per employee AND per client
        # ------------------------------------------------------------------
        raw_count = queryset.count()
        print(f"[Mandays Summary] Raw ManDayEntry rows: {raw_count}")

        seen_ids = set()
        duplicate_ids = []
        # grouped[employee_key] = { info..., 'per_client': { client_key: {plan, off} } }
        grouped = {}
        clients_seen = {}  # client_key -> client_name

        for entry in queryset.order_by('employee_id', 'id'):
            entry_id = entry.id
            if entry_id in seen_ids:
                duplicate_ids.append(entry_id)
                continue
            seen_ids.add(entry_id)

            client_obj = (
                entry.big_task.project.client
                if entry.big_task and entry.big_task.project and entry.big_task.project.client
                else entry.additional_task.client if entry.additional_task else None
            )
            client_key = str(client_obj.id) if client_obj else ''
            if not client_key:
                continue

            if client_key not in clients_seen:
                clients_seen[client_key] = client_name_map.get(client_key, getattr(client_obj, 'company_name', f'Client {client_key}'))

            employee_user = getattr(entry.employee, 'user', None)
            employee_key = str(getattr(employee_user, 'id', None) or entry.employee_id)
            if not employee_key:
                continue

            employee_label = ''
            if employee_user:
                full_name = f"{(employee_user.first_name or '').strip()} {(employee_user.last_name or '').strip()}".strip()
                employee_label = employee_user.username or full_name or employee_user.email or f'Employee {employee_key}'
            else:
                employee_label = f'Employee {employee_key}'

            role = str(getattr(employee_user, 'role', '') or '').upper() if employee_user else 'EMPLOYEE'

            current_group = grouped.get(employee_key)
            if not current_group:
                current_group = {
                    'employee_id': employee_key,
                    'employee_name': employee_label,
                    'employee_role': role,
                    'month': m,
                    'year': y,
                    'per_client': {},
                    'total_plan_hours': 0,
                    'total_off_hours': 0,
                    'records': 0,
                }
                grouped[employee_key] = current_group

            # Per-client accumulation
            pc = current_group['per_client'].get(client_key)
            if not pc:
                pc = {'plan_hours': 0, 'off_hours': 0}
                current_group['per_client'][client_key] = pc

            plan_hours = float(entry.plan_hours or 0)
            off_hours = float(entry.off_hours or 0)
            pc['plan_hours'] += plan_hours
            pc['off_hours'] += off_hours
            current_group['total_plan_hours'] += plan_hours
            current_group['total_off_hours'] += off_hours
            current_group['records'] += 1

        # Build clients list sorted by name
        clients_list = sorted(
            [{'id': cid, 'name': cname} for cid, cname in clients_seen.items()],
            key=lambda c: c['name']
        )

        # Build employees list
        employees_list = []
        for emp in grouped.values():
            per_client_out = {}
            for cid, pc in emp['per_client'].items():
                plan = pc['plan_hours']
                off = pc['off_hours']
                per_client_out[cid] = {
                    'onsite_days': round(plan / 6, 2) if plan else 0,
                    'offsite_days': round(off / 7.5, 2) if off else 0,
                }

            total_plan = emp['total_plan_hours']
            total_off = emp['total_off_hours']
            onsite_days = round(total_plan / 6, 2) if total_plan else 0
            offsite_days = round(total_off / 7.5, 2) if total_off else 0

            employees_list.append({
                'employee_id': emp['employee_id'],
                'employee_name': emp['employee_name'],
                'employee_role': emp['employee_role'],
                'records': emp['records'],
                'per_client': per_client_out,
                'total_onsite_days': onsite_days,
                'total_offsite_days': offsite_days,
                'total_days': round(onsite_days + offsite_days, 2),
            })

        # Role sorting priority: MLS (0), KAYAARA (1), SGM (2), EMPLOYEE/others (3)
        role_priority = {
            'MLS': 0,
            'KAYAARA': 1,
            'SGM': 2,
            'EMPLOYEE': 3
        }

        def get_emp_sort_key(emp_item):
            r_upper = str(emp_item.get('employee_role', '')).upper()
            priority = role_priority.get(r_upper, 4)
            return (priority, emp_item['employee_name'].lower())

        employees_list = sorted(employees_list, key=get_emp_sort_key)

        # Debug
        print(f"[Mandays Summary] Clients: {len(clients_list)}, Employees: {len(employees_list)}")
        if duplicate_ids:
            print(f"[Mandays Summary] WARNING: Duplicate IDs skipped: {sorted(set(duplicate_ids))}")
        for emp in employees_list:
            print(f"[Mandays Summary]   {emp['employee_name']}: total_days={emp['total_days']}")
        print(f"[Mandays Summary] === DEBUG END ===\n")

        return Response({
            "clients": clients_list,
            "employees": employees_list,
        }, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        print("\n=== ManDayEntry LIST called ===")
        print(f"Pagination class: {self.pagination_class}")
        response = super().list(request, *args, **kwargs)
        print(f"Response type: {type(response.data)}")
        print(f"Response data (first 5): {response.data[:5] if isinstance(response.data, list) else response.data}")
        print("=== End LIST ===\n")
        return response

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by client/month/year via relations if needed, but basic params support is good
        client_id = self.request.query_params.get('client_id')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        employee_id = self.request.query_params.get('employee_id')
        approved_only = str(self.request.query_params.get('approved_only', '')).lower() in {'1', 'true', 'yes'}

        if not _reviewer_can_view_ddtme_payload(self.request, client_id, month, year):
            return queryset.none()

        print(f"\n=== ManDayEntry Query Debug ===")
        print(f"User: {self.request.user} | Role: {getattr(self.request.user, 'role', 'N/A')}")
        print(f"Client ID: {client_id} | Month: {month} | Year: {year} | Employee ID: {employee_id}")
        print(f"Initial queryset count: {queryset.count()}")

        if client_id:
            queryset = queryset.filter(
                models.Q(big_task__project__client__id=client_id) |
                models.Q(additional_task__client_id=client_id)
            )
            print(f"After client filter, count: {queryset.count()}")
        
        if month: 
            queryset = queryset.filter(month=month)
            print(f"After month filter, count: {queryset.count()}")
            
        if year: 
            queryset = queryset.filter(year=year)
            print(f"After year filter, count: {queryset.count()}")
            
        if employee_id: 
            queryset = queryset.filter(employee_id=employee_id)
            print(f"After employee filter, count: {queryset.count()}")

        # Mandays planning should only consume approved DDTME values.
        if approved_only and client_id and month and year:
            is_approved = DDTMESubmission.objects.filter(
                client_id=client_id,
                month=month,
                year=year,
                status='Approved'
            ).exists()
            if not is_approved:
                return queryset.none()

        print(f"Final queryset count: {queryset.count()}")
        print(f"Sample entries: {list(queryset[:3].values())}")
        print("=== End Debug ===\n")
        
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_update_hours(self, request):
        entries = request.data.get('entries', [])
        # Entry format: { task_id, task_type ('big' or 'add'/'additional'), employee_id, month, year, plan_hours, off_hours }

        def get_mls_user():
            mls_qs = User.objects.filter(role='MLS', is_active=True)
            mls_user = mls_qs.filter(
                models.Q(username__icontains='mls') |
                models.Q(first_name__icontains='mls') |
                models.Q(last_name__icontains='mls') |
                models.Q(email__icontains='mls')
            ).first() or mls_qs.first()

            # MLS entries must resolve to an explicit MLS account.
            return mls_user

        def get_sgm_user(task_type, task_id):
            if task_type == 'big':
                task = BigTask.objects.select_related('project__assigned_sgm').filter(id=task_id).first()
                if task and task.project and task.project.assigned_sgm:
                    return task.project.assigned_sgm
                return None

            task = DDTMEAdditionalTask.objects.select_related('project__assigned_sgm', 'client').prefetch_related('client__assigned_sgms').filter(id=task_id).first()
            if not task:
                return None
            if task.project and task.project.assigned_sgm:
                return task.project.assigned_sgm
            if task.client and task.client.assigned_sgms.exists():
                return task.client.assigned_sgms.first()
            return None

        def get_kayaara_user(task_type, task_id):
            if task_type == 'big':
                task = BigTask.objects.select_related('project__assigned_kayaara', 'project__client').prefetch_related('project__client__assigned_kayaaras').filter(id=task_id).first()
                if not task or not task.project:
                    return None
                if task.project.assigned_kayaara:
                    return task.project.assigned_kayaara
                if task.project.client and task.project.client.assigned_kayaaras.exists():
                    return task.project.client.assigned_kayaaras.first()
                return None

            task = DDTMEAdditionalTask.objects.select_related('project__assigned_kayaara', 'client').prefetch_related('client__assigned_kayaaras').filter(id=task_id).first()
            if not task:
                return None
            if task.project and task.project.assigned_kayaara:
                return task.project.assigned_kayaara
            if task.client and task.client.assigned_kayaaras.exists():
                return task.client.assigned_kayaaras.first()
            return None

        def resolve_employee(raw_employee_id, task_type, task_id):
            if raw_employee_id is None:
                return None

            employee_ref = str(raw_employee_id).strip()
            if not employee_ref:
                return None

            alias = employee_ref.lower()
            if alias in {'sgm', 'mls', 'kayaara'}:
                if alias == 'sgm':
                    linked_user = get_sgm_user(task_type, task_id)
                elif alias == 'kayaara':
                    linked_user = get_kayaara_user(task_type, task_id)
                else:
                    linked_user = get_mls_user()
                if not linked_user:
                    return None
                employee_obj, _ = Employee.objects.get_or_create(user=linked_user)
                return employee_obj

            if employee_ref.startswith('u-'):
                user_id_str = employee_ref[2:]
                if not user_id_str.isdigit():
                    return None
                user_obj = User.objects.filter(id=int(user_id_str)).first()
                if not user_obj:
                    return None
                employee_obj, _ = Employee.objects.get_or_create(user=user_obj)
                return employee_obj

            if employee_ref.startswith('e-'):
                employee_id_str = employee_ref[2:]
                if not employee_id_str.isdigit():
                    return None
                return Employee.objects.filter(id=int(employee_id_str)).first()

            if employee_ref.isdigit():
                numeric_id = int(employee_ref)

                # Backward compatibility path: existing payloads may send employee PK.
                employee_obj = Employee.objects.filter(id=numeric_id).first()
                if employee_obj:
                    return employee_obj

                # If a user id is sent directly, resolve and ensure employee profile exists.
                user_obj = User.objects.filter(id=numeric_id).first()
                if user_obj:
                    employee_obj, _ = Employee.objects.get_or_create(user=user_obj)
                    return employee_obj

            return None
        
        results = []
        errors = []
        for entry in entries:
            try:
                raw_task_type = str(entry.get('task_type', '')).lower()
                if raw_task_type == 'big':
                    task_type = 'big'
                elif raw_task_type in {'add', 'additional'}:
                    task_type = 'additional'
                else:
                    raise ValueError(f"Invalid task_type: {entry.get('task_type')}")

                task_id = int(entry.get('task_id'))
                month = int(entry.get('month'))
                year = int(entry.get('year'))

                try:
                    plan = Decimal(str(entry.get('plan_hours', 0) or 0))
                    off = Decimal(str(entry.get('off_hours', 0) or 0))
                except (InvalidOperation, TypeError, ValueError):
                    raise ValueError('Plan/Off hours must be numeric values')

                if plan < 0 or off < 0:
                    raise ValueError('Plan/Off hours cannot be negative')

                plan = plan.quantize(Decimal('0.01'))
                off = off.quantize(Decimal('0.01'))

                employee_obj = resolve_employee(entry.get('employee_id'), task_type, task_id)
                if not employee_obj:
                    raise ValueError(f"Unable to resolve employee: {entry.get('employee_id')}")
                
                kwargs = {
                    'employee': employee_obj,
                    'month': month,
                    'year': year
                }
                
                if task_type == 'big':
                    kwargs['big_task_id'] = task_id
                    kwargs['additional_task'] = None
                else:
                    kwargs['additional_task_id'] = task_id
                    kwargs['big_task'] = None
                
                obj, created = ManDayEntry.objects.update_or_create(
                    defaults={'plan_hours': plan, 'off_hours': off},
                    **kwargs
                )
                results.append(obj.id)
            except Exception as e:
                errors.append({
                    "entry": entry,
                    "error": str(e)
                })
                print(f"Error saving entry: {e} | entry={entry}")
                
        if errors:
            return Response({"updated": len(results), "ids": results, "failed": errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"updated": len(results), "ids": results, "failed": []})


from .models import KPI, KPIUpdate
from .serializers import KPISerializer, KPIUpdateSerializer

class KPIViewSet(viewsets.ModelViewSet):
    serializer_class = KPISerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = KPI.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset

class KPIUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = KPIUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = KPIUpdate.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        kpi_id = self.request.query_params.get('kpi_id')
        if kpi_id:
            queryset = queryset.filter(kpi_id=kpi_id)
        return queryset

    @action(detail=False, methods=['post'])
    def batch_update(self, request):
        updates = request.data.get('updates', [])
        # updates format: [{kpi_id, month, update_value}, ...]
        results = []
        for entry in updates:
            kpi_id = entry.get('kpi_id')
            month = entry.get('month')
            value = entry.get('update_value')
            if kpi_id and month:
                obj, created = KPIUpdate.objects.update_or_create(
                    kpi_id=kpi_id,
                    month=month,
                    defaults={'update_value': value}
                )
                results.append(obj.id)
        return Response({"updated": len(results)})


from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from clients.models import Client
from clients.models import ExternalTeam
from employees.models import Employee
from .models import MCTCEntry, MCTCEntryHistory
from .serializers import (
    MCTCEntrySerializer,
    MCTCEntryMoveSerializer,
    MCTCEntryHistorySerializer,
)
from projects.models import Project
from sgm.models import ProjectTeam


class MCTCEntryViewSet(viewsets.ModelViewSet):
    serializer_class = MCTCEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

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

    def _get_senior_scoped_external_ids(self):
        request_user = self.request.user
        client_ids = ExternalTeam.objects.filter(user=request_user).values_list('client_org_id', flat=True)

        return {
            external_user_id
            for external_user_id in ExternalTeam.objects.filter(
                client_org_id__in=client_ids,
                user__role='EXTERNAL'
            ).values_list('user_id', flat=True)
            if external_user_id is not None
        }

    def get_queryset(self):
        request_user = self.request.user
        queryset = MCTCEntry.objects.filter(user=request_user)

        requested_user = self.request.query_params.get('user')
        if requested_user:
            try:
                requested_user_id = int(requested_user)
            except (TypeError, ValueError):
                return queryset.none()

            if requested_user_id == request_user.id:
                queryset = MCTCEntry.objects.filter(user=request_user)
                requested_user_id = None

            if requested_user_id:
                if request_user.role == 'SGM':
                    scoped_employee_ids = self._get_sgm_scoped_employee_ids()
                    if requested_user_id in scoped_employee_ids:
                        queryset = MCTCEntry.objects.filter(user_id=requested_user_id)
                    else:
                        return queryset.none()
                elif request_user.role == 'KAYAARA':
                    can_access_employee = Employee.objects.filter(user_id=requested_user_id).exists()
                    if can_access_employee:
                        queryset = MCTCEntry.objects.filter(user_id=requested_user_id)
                    else:
                        return queryset.none()
                elif request_user.role == 'SENIOR':
                    scoped_external_ids = self._get_senior_scoped_external_ids()
                    if requested_user_id in scoped_external_ids:
                        queryset = MCTCEntry.objects.filter(user_id=requested_user_id)
                    else:
                        return queryset.none()
                else:
                    return queryset.none()

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if year and month:
            try:
                year_int = int(year)
                month_int = int(month)
                if 1 <= month_int <= 12:
                    queryset = queryset.filter(
                        entry_date__year=year_int,
                        entry_date__month=month_int
                    )
            except (TypeError, ValueError):
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # ── Drag-drop move ──────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='move')
    def move(self, request, pk=None):
        """
        Move an MCTC entry to a new date / half.

        POST /api/mctc/entries/{id}/move/
        Body: { "new_date": "2026-06-15", "new_half": "second_half" }

        Steps:
        1. Validate new_date and new_half
        2. Create MCTCEntryHistory record
        3. Increment revision_count
        4. Update entry_date = new_date
        5. Update half_type = new_half
        6. Update last_revision_date = now
        7. If linked_task exists, update task.target_date
        8. Return updated entry
        """
        entry = self.get_object()
        move_serializer = MCTCEntryMoveSerializer(data=request.data)
        move_serializer.is_valid(raise_exception=True)

        new_date = move_serializer.validated_data['new_date']
        new_half = move_serializer.validated_data['new_half']

        old_date = entry.entry_date
        old_half = entry.half_type

        # Skip if nothing changed
        if old_date == new_date and old_half == new_half:
            return Response(
                MCTCEntrySerializer(entry).data,
                status=status.HTTP_200_OK,
            )

        # Step 2: Create history record
        MCTCEntryHistory.objects.create(
            entry=entry,
            old_date=old_date,
            new_date=new_date,
            old_half=old_half,
            new_half=new_half,
            moved_by=request.user,
        )

        # Step 3-6: Update entry
        entry.entry_date = new_date
        entry.half_type = new_half
        entry.revision_count += 1
        entry.last_revision_date = timezone.now()

        is_place = entry.entry_type == MCTCEntry.TYPE_NORMAL
        if is_place:
            if entry.label.startswith('__MCTC_PLACE__'):
                parts = entry.label.split('|')
                if len(parts) >= 3:
                    parts[2] = 'half2' if new_half == 'second_half' else 'half1'
                    entry.label = '|'.join(parts)
            else:
                import re
                legacy_pattern = re.compile(r'^(Onsite|Offsite)\s+-\s+(Half\s+[12])\s+-\s+(.+)$', re.IGNORECASE)
                match = legacy_pattern.match(entry.label)
                if match:
                    day_type = 'offsite' if match.group(1).lower() == 'offsite' else 'onsite'
                    half_key = 'half2' if new_half == 'second_half' else 'half1'
                    mode_text = match.group(3).strip().lower()
                    if mode_text == 'office':
                        mode = 'office'
                        company = ''
                    elif mode_text == 'leave':
                        mode = 'leave'
                        company = ''
                    else:
                        mode = 'visit'
                        company = match.group(3).strip()
                    entry.label = f"__MCTC_PLACE__|{day_type}|{half_key}|{mode}|{company}"

            # Delete any existing place entry at target location to avoid duplicate stacked modes
            MCTCEntry.objects.filter(
                user=entry.user,
                entry_date=new_date,
                half_type=new_half,
                entry_type=MCTCEntry.TYPE_NORMAL
            ).exclude(id=entry.id).delete()

        entry.save()

        # Step 7: Update linked task target_date if present
        if entry.linked_task_id:
            task = entry.linked_task
            task.target_date = new_date
            task.save()

        # If it is a place entry, find and move all task entries for the same user, date, and half
        if is_place:
            associated_tasks = MCTCEntry.objects.filter(
                user=entry.user,
                entry_date=old_date,
                half_type=old_half,
                entry_type=MCTCEntry.TYPE_TASK
            )
            for task_entry in associated_tasks:
                # Create history for task entry
                MCTCEntryHistory.objects.create(
                    entry=task_entry,
                    old_date=old_date,
                    new_date=new_date,
                    old_half=old_half,
                    new_half=new_half,
                    moved_by=request.user,
                )
                task_entry.entry_date = new_date
                task_entry.half_type = new_half
                task_entry.revision_count += 1
                task_entry.last_revision_date = timezone.now()
                task_entry.save()

                if task_entry.linked_task_id:
                    t = task_entry.linked_task
                    t.target_date = new_date
                    t.save()

        return Response(
            MCTCEntrySerializer(entry).data,
            status=status.HTTP_200_OK,
        )

    # ── Movement history timeline ────────────────────────────────

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        """
        GET /api/mctc/entries/{id}/history/

        Returns the full audit trail for an entry's movements.
        """
        entry = self.get_object()
        history_qs = MCTCEntryHistory.objects.filter(entry=entry).order_by('moved_at')
        serializer = MCTCEntryHistorySerializer(history_qs, many=True)

        return Response({
            'entry_id': entry.id,
            'label': entry.label,
            'original_date': entry.original_date,
            'current_date': entry.entry_date,
            'current_half': entry.half_type,
            'revision_count': entry.revision_count,
            'history': serializer.data,
        })

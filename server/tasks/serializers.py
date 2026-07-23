from rest_framework import serializers
from .models import Task, TimeEntry
from django.contrib.auth import get_user_model
from ddfms.models import DDFMSDeliverable, DDFMSStep
from ddtme.models import BigTask, DDTMEAdditionalTask

User = get_user_model()


class TimeEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeEntry
        fields = [
            'id', 'task', 'user', 'user_name', 'description',
            'start_time', 'end_time', 'duration_minutes',
            'is_running', 'is_billable', 'date', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']

    def get_user_name(self, obj):
        if not obj.user:
            return None
        return obj.user.full_name or obj.user.username or obj.user.email


class TaskSerializer(serializers.ModelSerializer):
    priority = serializers.ChoiceField(
        choices=[
            ('HIGH', 'High'),
            ('MEDIUM', 'Medium'),
            ('LOW', 'Low'),
        ],
        required=False,
        default='LOW',
    )
    flag = serializers.ChoiceField(
        choices=[
            ('none', 'None'),
            ('document', 'Document'),
            ('discuss', 'Discuss'),  # Legacy alias accepted on input.
            ('training', 'Training'),
            ('resource', 'Resource'),
        ],
        required=False,
        allow_blank=True,
        default='none',
    )
    # These fields provide names to your React tables (Read Only)
    assigned_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    client_name = serializers.ReadOnlyField(source='client_org.company_name')
    
    # MCTC-related fields for calendar enhancement
    mctc_entry_id = serializers.SerializerMethodField()
    original_date = serializers.SerializerMethodField()
    revision_count = serializers.SerializerMethodField()
    last_revision_date = serializers.SerializerMethodField()
    half_type = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'task_id', 'title', 'description', 
            'project', 'project_name',
            'client_org', 'client_name',
            'assigned_to', 'assigned_to_name',
            'assigned_by', 'assigned_by_name',
            'start_date', 'target_date', 'completion_date',
            'status', 'priority', 'flag', 'remarks', 'ats_score',
            'estimated_hours', 'actual_hours',
            'assigned_file', 'completion_file',
            'is_repeatable', 'repeat_frequency', 'repeat_end_date', 'repeat_day', 'repeat_week',
            'source_module',
            # MCTC fields
            'mctc_entry_id', 'original_date', 'revision_count', 'last_revision_date', 'half_type'
        ]
        # These are handled by the backend logic, not the user form
        read_only_fields = ['task_id', 'assigned_by']

    def get_assigned_by_name(self, obj):
        if str(obj.source_module or '').strip().upper() == 'DDFMS':
            return 'DDFMS'

        if not obj.assigned_by:
            return None

        return self._get_display_name(obj.assigned_by)

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return None

        return self._get_display_name(obj.assigned_to)

    def _get_display_name(self, user):
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if full_name:
            return full_name

        return user.username or user.email

    def get_project_name(self, obj):
        if obj.project_id and obj.project:
            return obj.project.name

        if str(obj.source_module or '').strip().upper() == 'DDFMS' and obj.source_ref_id:
            step = DDFMSStep.objects.select_related('deliverable').filter(id=obj.source_ref_id).first()
            if not step or not step.deliverable:
                return None

            deliverable = step.deliverable
            if deliverable.source_type == DDFMSDeliverable.SOURCE_BIG_TASK and deliverable.source_id:
                big_task = BigTask.objects.select_related('project').filter(id=deliverable.source_id).first()
                if big_task and big_task.project:
                    return big_task.project.name

            if deliverable.source_type == DDFMSDeliverable.SOURCE_ADDITIONAL_TASK and deliverable.source_id:
                additional_task = DDTMEAdditionalTask.objects.select_related('project').filter(id=deliverable.source_id).first()
                if additional_task and additional_task.project:
                    return additional_task.project.name

        return None

    def get_mctc_entry_id(self, obj):
        entry = obj.linked_mctc_entries.first()
        return entry.id if entry else None

    def get_original_date(self, obj):
        entry = obj.linked_mctc_entries.first()
        return entry.original_date if entry else None

    def get_revision_count(self, obj):
        entry = obj.linked_mctc_entries.first()
        return entry.revision_count if entry else 0

    def get_last_revision_date(self, obj):
        entry = obj.linked_mctc_entries.first()
        return entry.last_revision_date if entry else None

    def get_half_type(self, obj):
        entry = obj.linked_mctc_entries.first()
        return entry.half_type if entry else None

    def validate(self, data):
        """
        Validation logic: Ensures the assigned user is part of the project team.
        Matches ProjectSerializer membership sources for consistency.
        """
        project = data.get('project')
        assigned_to = data.get('assigned_to')
        client_org = data.get('client_org')
        request = self.context.get('request')
        assigner = getattr(request, 'user', None)

        if project:
            if not client_org:
                data['client_org'] = project.client
            elif client_org != project.client:
                raise serializers.ValidationError({
                    "client_org": "Client does not match the selected project."
                })

        if project and assigned_to:
            member_ids = set()

            member_ids.update(project.assigned_employees.values_list('user__id', flat=True))
            member_ids.update(project.external_team.values_list('id', flat=True))

            if project.client_id and hasattr(project.client, "internal_team"):
                member_ids.update(project.client.internal_team.values_list('id', flat=True))

            if project.client_id and hasattr(project.client, "external_members"):
                member_ids.update(project.client.external_members.values_list('user__id', flat=True))

            if project.client_id and getattr(project.client, 'user_id', None):
                member_ids.add(project.client.user_id)

            if project.assigned_sgm_id:
                member_ids.add(project.assigned_sgm_id)
            if project.external_lead_id:
                member_ids.add(project.external_lead_id)
            if project.created_by_id:
                member_ids.add(project.created_by_id)

            team = None
            try:
                team = project.sgm_team
            except Exception:
                team = None

            if team:
                member_ids.update(team.internal_members.values_list('id', flat=True))
                member_ids.update(team.external_members.values_list('id', flat=True))

            # Allow assigning to KAYAARA from any role and allow KAYAARA assigners to target any user.
            if assigned_to.role in [User.SGM, User.KAYAARA]:
                return data

            if assigner and assigner.role == User.KAYAARA:
                return data

            if assigned_to.id not in member_ids:
                raise serializers.ValidationError(
                    f"User {assigned_to.username} is not a member of project '{project.name}'."
                )

        # Keep legacy clients compatible when flag is omitted or sent as blank.
        if not data.get('flag'):
            data['flag'] = 'none'
        elif data.get('flag') == 'discuss':
            data['flag'] = 'document'

        return data
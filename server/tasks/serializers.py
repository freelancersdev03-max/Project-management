from rest_framework import serializers
from .models import Task
from django.contrib.auth import get_user_model

User = get_user_model()

class TaskSerializer(serializers.ModelSerializer):
    # These fields provide names to your React tables (Read Only)
    assigned_by_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    project_name = serializers.ReadOnlyField(source='project.name')
    client_name = serializers.ReadOnlyField(source='client_org.company_name')
    
    # This brings the math from your model property into the JSON for React
    # ats_score is now a model field, so we don't need source='calculate_ats'
    

    class Meta:
        model = Task
        fields = [
            'id', 'task_id', 'title', 'description', 
            'project', 'project_name',
            'client_org', 'client_name',
            'assigned_to', 'assigned_to_name',
            'assigned_by', 'assigned_by_name',
            'start_date', 'target_date', 'completion_date',
            'status', 'remarks', 'ats_score',
            'assigned_file', 'completion_file',
            'is_repeatable', 'repeat_frequency', 'repeat_end_date', 'repeat_day', 'repeat_week',
            'source_module'
        ]
        # These are handled by the backend logic, not the user form
        read_only_fields = ['task_id', 'assigned_by']

    def get_assigned_by_name(self, obj):
        if str(obj.source_module or '').strip().upper() == 'DDFMS':
            return 'DDFMS'

        if not obj.assigned_by:
            return None

        return obj.assigned_by.username

    def validate(self, data):
        """
        Validation logic: Ensures the assigned user is part of the project team.
        Matches ProjectSerializer membership sources for consistency.
        """
        project = data.get('project')
        assigned_to = data.get('assigned_to')
        client_org = data.get('client_org')

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

            if assigned_to.role == "SGM":
                return data

            if assigned_to.id not in member_ids:
                raise serializers.ValidationError(
                    f"User {assigned_to.username} is not a member of project '{project.name}'."
                )

        return data
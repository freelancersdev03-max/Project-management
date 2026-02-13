from rest_framework import serializers
from .models import Task
from django.contrib.auth import get_user_model

User = get_user_model()

class TaskSerializer(serializers.ModelSerializer):
    # These fields provide names to your React tables (Read Only)
    assigned_by_name = serializers.ReadOnlyField(source='assigned_by.username')
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
            'is_repeatable', 'repeat_frequency', 'repeat_end_date', 'repeat_day', 'repeat_week'
        ]
        # These are handled by the backend logic, not the user form
        read_only_fields = ['task_id', 'assigned_by']

    def validate(self, data):
        """
        Validation logic: Ensures the assigned user is part of the project team.
        """
        project = data.get('project')
        assigned_to = data.get('assigned_to')

        if project and assigned_to:
            # Check project leads (SGM/External) and team members (Employees)
            is_internal_lead = (project.internal_lead == assigned_to)
            is_external_lead = (project.external_lead == assigned_to)
            is_team_member = project.team_members.filter(id=assigned_to.id).exists()
            
            try:
                is_sgm_team_member = project.sgm_team.filter(member=assigned_to).exists()
            except (AttributeError, Exception):
                # Fallback if sgm app is not installed or relationship is broken
                is_sgm_team_member = False

            if not (is_internal_lead or is_external_lead or is_team_member or is_sgm_team_member):
                raise serializers.ValidationError(
                    f"User {assigned_to.username} is not a member of project '{project.name}'."
                )

        return data
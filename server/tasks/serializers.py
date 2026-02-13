from rest_framework import serializers
from .models import Task
from django.contrib.auth import get_user_model
from employees.models import Employee

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
        Project can have: assigned_sgm, external_lead, assigned_employees (ManyToMany), external_team (ManyToMany)
        """
        project = data.get('project')
        assigned_to = data.get('assigned_to')

        if project and assigned_to:
            # Check SGM lead
            is_sgm = (project.assigned_sgm and project.assigned_sgm.id == assigned_to.id)
            
            # Check External lead
            is_external_lead = (project.external_lead and project.external_lead.id == assigned_to.id)
            
            # Check assigned employees (need to check user via employee)
            is_assigned_employee = Employee.objects.filter(
                user=assigned_to,
                projects=project
            ).exists()
            
            # Check external team
            is_external_team = project.external_team.filter(id=assigned_to.id).exists()
            
            # Check creator (optional - they might assign tasks too)
            is_creator = (project.created_by and project.created_by.id == assigned_to.id)

            if not (is_sgm or is_external_lead or is_assigned_employee or is_external_team or is_creator):
                raise serializers.ValidationError(
                    f"User {assigned_to.username} is not a member of project '{project.name}'."
                )

        return data
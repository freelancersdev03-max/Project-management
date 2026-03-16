from rest_framework import serializers
from functools import cached_property
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import BigTask, DDTMESubmission, DDTMEAdditionalTask, ManDayEntry, DDTMEMonthlyObjective

User = get_user_model()

class BigTaskSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    sgm_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BigTask
        fields = ['id', 'project', 'project_name', 'sgm_name', 'title', 'ddtme_title', 'start_date', 'target_date', 'status', 'type', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sgm_name(self, obj):
        if obj.project and obj.project.assigned_sgm:
            sgm = obj.project.assigned_sgm
            return sgm.shortform or f"{sgm.first_name} {sgm.last_name}"
        return "-"

    def validate(self, data):
        # Resolve values for Create vs Update
        instance = self.instance
        
        # Get new values or fallback to existing
        project = data.get('project')
        start_date = data.get('start_date')
        target_date = data.get('target_date')

        if instance:
            # If update, fallback to instance values if not provided
            project = project or instance.project
            start_date = start_date if 'start_date' in data else instance.start_date
            target_date = target_date if 'target_date' in data else instance.target_date

        # If we still don't have a project (unlikely for valid BigTask), skip
        if not project:
            return data

        try:
            if project.start_date and start_date and start_date < project.start_date:
                raise serializers.ValidationError({
                    "start_date": f"Task cannot start before the project start date ({project.start_date})"
                })
            
            if project.end_date and target_date and target_date > project.end_date:
                raise serializers.ValidationError({
                    "target_date": f"Task cannot end after the project end date ({project.end_date})"
                })
                
            if start_date and target_date and start_date > target_date:
                raise serializers.ValidationError({"non_field_errors": ["Start date cannot be after target date."]})

        except TypeError as e:
            # Catch defensive coding errors (e.g. date vs None comparison) and return 400
            raise serializers.ValidationError({"non_field_errors": [f"Date validation error: {str(e)}"]})

        return data


class DDTMESubmissionSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.company_name', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = DDTMESubmission
        fields = ['id', 'client', 'client_name', 'month', 'year', 'status', 'remarks', 'submitted_by', 'submitted_by_name', 'approved_by', 'approved_by_name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class DDTMEAdditionalTaskSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    sgm_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DDTMEAdditionalTask
        fields = ['id', 'client', 'project', 'project_name', 'sgm_name', 'month', 'year', 'title', 'target_date', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sgm_name(self, obj):
        # Try to get from project first
        if obj.project and obj.project.assigned_sgm:
            sgm = obj.project.assigned_sgm
            return sgm.shortform or f"{sgm.first_name} {sgm.last_name}"
        # If no project SGM, try to get from client
        if obj.client and obj.client.assigned_sgms.exists():
            sgm = obj.client.assigned_sgms.first()
            return sgm.shortform or f"{sgm.first_name} {sgm.last_name}"
        return "-"


class DDTMEMonthlyObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = DDTMEMonthlyObjective
        fields = ['id', 'client', 'month', 'year', 'objective', 'is_completed', 'created_at']
        read_only_fields = ['id', 'created_at']


class ManDayEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_user_id = serializers.SerializerMethodField()
    person_key = serializers.SerializerMethodField()
    big_task_title = serializers.CharField(source='big_task.title', read_only=True)
    additional_task_title = serializers.CharField(source='additional_task.title', read_only=True)
    plan_hours = serializers.DecimalField(max_digits=8, decimal_places=2, coerce_to_string=False)
    off_hours = serializers.DecimalField(max_digits=8, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = ManDayEntry
        fields = ['id', 'employee', 'employee_user_id', 'employee_name', 'person_key', 'month', 'year', 'big_task', 'big_task_title', 'additional_task', 'additional_task_title', 'plan_hours', 'off_hours']
        read_only_fields = ['id']

    @cached_property
    def owner_user_id(self):
        hqepl_qs = User.objects.filter(role='HQEPL', is_active=True)
        owner_user = hqepl_qs.filter(
            Q(username__icontains='mls') |
            Q(first_name__icontains='mls') |
            Q(last_name__icontains='mls') |
            Q(email__icontains='mls')
        ).first() or hqepl_qs.first()

        if owner_user:
            return owner_user.id

        admin_user = User.objects.filter(role='ADMIN', is_active=True).order_by('id').first()
        return admin_user.id if admin_user else None

    def get_employee_user_id(self, obj):
        return getattr(obj.employee, 'user_id', None)

    def get_person_key(self, obj):
        user_id = getattr(obj.employee, 'user_id', None)
        if user_id:
            if self.owner_user_id and user_id == self.owner_user_id:
                return 'mls'
            return f'u-{user_id}'

        if obj.employee_id:
            return f'e-{obj.employee_id}'

        return None

    def get_employee_name(self, obj):
        user = getattr(obj.employee, 'user', None)
        if not user:
            return ""
        if user.shortform:
            return user.shortform
        full_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
        return full_name or user.username or user.email


from .models import KPI, KPIUpdate

class KPIUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIUpdate
        fields = ['id', 'kpi', 'month', 'update_value']
        read_only_fields = ['id']

class KPISerializer(serializers.ModelSerializer):
    updates = KPIUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = KPI
        fields = ['id', 'project', 'name', 'baseline', 'target', 'updates', 'created_at']
        read_only_fields = ['id', 'created_at']


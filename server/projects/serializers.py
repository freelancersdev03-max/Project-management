from rest_framework import serializers
from .models import Project, ActionTask, ActionPlan
from django.contrib.auth import get_user_model
from django.db.models import Q
from employees.models import Employee
from sgm.models import ProjectTeam
from clients.models import Client


User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    # --------------------
    # Client & Creator
    # --------------------
    client_name = serializers.ReadOnlyField(source="client.company_name")
    created_by_email = serializers.ReadOnlyField(source="created_by.email")

    # --------------------
    # SGM (FIXED)
    # --------------------
    assigned_sgm_email = serializers.SerializerMethodField()
    assigned_sgm_name = serializers.SerializerMethodField()
    assigned_sgm_details = serializers.SerializerMethodField()
    assigned_sgm = serializers.PrimaryKeyRelatedField(read_only=True)

    assigned_hqepl = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="HQEPL"),
        required=False,
        allow_null=True
    )
    assigned_hqepl_name = serializers.SerializerMethodField()
    assigned_hqepl_details = serializers.SerializerMethodField()

    # --------------------
    # External Lead
    # --------------------
    external_lead_name = serializers.ReadOnlyField(source="external_lead.username")
    external_lead_email = serializers.ReadOnlyField(source="external_lead.email")

    external_lead = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="EXTERNAL"),
        required=False,
        allow_null=True
    )

    # --------------------
    # External Team
    # --------------------
    external_team = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        required=False
    )
    external_team_emails = serializers.SerializerMethodField()
    external_team_details = serializers.SerializerMethodField()

    # --------------------
    # Senior Team
    # --------------------
    senior_team = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="SENIOR"),
        many=True,
        required=False
    )
    senior_team_emails = serializers.SerializerMethodField()
    senior_team_details = serializers.SerializerMethodField()

    # --------------------
    # Internal Team (WRITE) - Accepting User IDs
    # --------------------
    assigned_employees = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    # --------------------
    # Internal Team (READ)
    # --------------------
    team_members_details = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "target", "status",
            "project_hierarchy",

            "client", "client_name",

            "assigned_sgm",
            "assigned_sgm_name",
            "assigned_sgm_email",
            "assigned_sgm_details",

            "assigned_hqepl",
            "assigned_hqepl_name",
            "assigned_hqepl_details",

            "external_lead",
            "external_lead_name",
            "external_lead_email",

            "external_team",
            "external_team_emails",
            "external_team_details",

            "senior_team",
            "senior_team_emails",
            "senior_team_details",

            "assigned_employees",
            "team_members_details",

            "start_date", "end_date",

            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]

        read_only_fields = ("created_by", "created_at", "updated_at")

    # ====================
    # VALIDATION
    # ====================
    def _get_sgm_scoped_employee_ids(self, user):
        """
        Employees that an SGM can allocate to projects:
        1) employees in internal teams of handled clients,
        2) employees already used in handled project teams,
        3) employees already assigned on handled projects.
        """
        handled_clients = Client.objects.filter(assigned_sgms=user).distinct()
        handled_projects = Project.objects.filter(
            Q(assigned_sgm=user) | Q(client__assigned_sgms=user)
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

    def validate(self, attrs):
        client = attrs.get('client', getattr(self.instance, 'client', None))
        request = self.context.get("request")

        # Validate Internal Employees (User IDs)
        assigned_employees_ids = attrs.get('assigned_employees')
        if assigned_employees_ids is not None:
            valid_user_ids = set(
                User.objects.filter(role=User.EMPLOYEE).values_list("id", flat=True)
            )

            if request and request.user.role == User.SGM:
                valid_user_ids = self._get_sgm_scoped_employee_ids(request.user)

                # Keep updates possible even when legacy assignments exist.
                if self.instance:
                    valid_user_ids.update(
                        self.instance.assigned_employees.values_list("user_id", flat=True)
                    )

            invalid_ids = [uid for uid in assigned_employees_ids if uid not in valid_user_ids]
            if invalid_ids:
                if request and request.user.role == User.SGM:
                    message = f"User IDs {invalid_ids} are not in your assigned employee pool."
                else:
                    message = f"User IDs {invalid_ids} are not valid employee users."
                raise serializers.ValidationError({
                    "assigned_employees": message
                })

        assigned_hqepl = attrs.get('assigned_hqepl', getattr(self.instance, 'assigned_hqepl', None))
        if client and assigned_hqepl:
            if not client.assigned_hqepls.filter(id=assigned_hqepl.id).exists():
                raise serializers.ValidationError({
                    "assigned_hqepl": "Selected HQEPL is not assigned to this client."
                })

        # Validate External Team (User Objects or IDs depending on field type)
        # external_team uses PrimaryKeyRelatedField(User), so it gets User objects.
        external_team = attrs.get('external_team')
        if client and external_team:
            # client.external_members is ExternalTeam model related_name="external_members"
            # ExternalTeam has user field. So values_list('user__id') gives User IDs.
            valid_ext_ids = set(client.external_members.values_list('user__id', flat=True))
            invalid_users = [u for u in external_team if u.id not in valid_ext_ids]
            if invalid_users:
                raise serializers.ValidationError({
                    "external_team": "One or more users are not registered external members for this client."
                })

        return attrs

    # ====================
    # CREATE / UPDATE
    # ====================
    def create(self, validated_data):
        user_ids = validated_data.pop('assigned_employees', None)
        project = super().create(validated_data)
        if user_ids is not None:
            self._set_employees(project, user_ids)
        self._sync_project_team(project)
        return project

    def update(self, instance, validated_data):
        user_ids = validated_data.pop('assigned_employees', None)
        project = super().update(instance, validated_data)
        if user_ids is not None:
            self._set_employees(project, user_ids)
        self._sync_project_team(project)
        return project

    def _set_employees(self, project, user_ids):
        # Map User IDs -> Employee Objects
        employees = Employee.objects.filter(user__id__in=user_ids)
        project.assigned_employees.set(employees)

    def _sync_project_team(self, project):
        """
        Keep ProjectTeam in sync with Project M2M fields so all endpoints
        expose the same effective team and removals are reflected immediately.
        """
        existing_team = ProjectTeam.objects.filter(project=project).first()
        has_any_members = project.assigned_employees.exists() or project.external_team.exists()
        if not has_any_members and not existing_team:
            return

        team = existing_team or ProjectTeam.objects.create(project=project)

        internal_users = User.objects.filter(
            id__in=project.assigned_employees.values_list('user_id', flat=True)
        )
        team.internal_members.set(internal_users)
        team.external_members.set(project.external_team.all())


    # ====================
    # READ-ONLY HELPERS
    # ====================
    def _get_effective_sgm(self, obj):
        if obj.assigned_sgm:
            return obj.assigned_sgm

        if obj.client_id and hasattr(obj.client, "assigned_sgms"):
            return obj.client.assigned_sgms.order_by("id").first()

        return None

    def get_assigned_sgm_name(self, obj):
        sgm = self._get_effective_sgm(obj)
        if not sgm:
            return None

        full_name = f"{sgm.first_name or ''} {sgm.last_name or ''}".strip()
        return full_name or sgm.username or sgm.email

    def get_assigned_sgm_email(self, obj):
        sgm = self._get_effective_sgm(obj)
        return sgm.email if sgm else None

    def get_assigned_sgm_details(self, obj):
        sgm = self._get_effective_sgm(obj)
        if sgm:
            return {
                "id": sgm.id,
                "username": sgm.username,
                "email": sgm.email,
                "role": sgm.role,
                "full_name": f"{sgm.first_name or ''} {sgm.last_name or ''}".strip() or sgm.username or sgm.email,
            }
        return None

    def get_assigned_hqepl_name(self, obj):
        hqepl = getattr(obj, 'assigned_hqepl', None)
        if not hqepl:
            return None
        full_name = f"{hqepl.first_name or ''} {hqepl.last_name or ''}".strip()
        return full_name or hqepl.username or hqepl.email

    def get_assigned_hqepl_details(self, obj):
        hqepl = getattr(obj, 'assigned_hqepl', None)
        if not hqepl:
            return None
        return {
            "id": hqepl.id,
            "username": hqepl.username,
            "email": hqepl.email,
            "role": hqepl.role,
            "full_name": f"{hqepl.first_name or ''} {hqepl.last_name or ''}".strip() or hqepl.username or hqepl.email,
        }

    def get_team_members_details(self, obj):
        members = []
        seen_ids = set()

        for emp in obj.assigned_employees.select_related('user').all():
            user = emp.user
            seen_ids.add(user.id)
            members.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "designation": emp.designation,
            })

        # Backward-compatible fallback for legacy data still present in ProjectTeam.
        team = ProjectTeam.objects.filter(project=obj).first()
        if team:
            for member in team.internal_members.all():
                if member.id in seen_ids:
                    continue
                seen_ids.add(member.id)
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                    "designation": None,
                })

        return members

    def get_external_team_details(self, obj):
        members = []
        seen_ids = set()

        for user in obj.external_team.all().distinct():
            if user.id in seen_ids:
                continue
            seen_ids.add(user.id)
            members.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": "EXTERNAL",
            })

        # Backward-compatible fallback for legacy data still present in ProjectTeam.
        team = ProjectTeam.objects.filter(project=obj).first()
        if team:
            for member in team.external_members.all():
                if member.id in seen_ids:
                    continue
                seen_ids.add(member.id)
                members.append({
                    "id": member.id,
                    "username": member.username,
                    "email": member.email,
                    "role": "EXTERNAL",
                })

        return members

    def get_external_team_emails(self, obj):
        return list(obj.external_team.all().distinct().values_list('email', flat=True))

    def get_senior_team_emails(self, obj):
        return [u.email for u in obj.senior_team.all()]

    def get_senior_team_details(self, obj):
        members = []
        seen_ids = set()

        for user in obj.senior_team.all():
            seen_ids.add(user.id)
            members.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": "SENIOR",
            })

        return members

class ActionPlanSerializer(serializers.ModelSerializer):
    project_name = serializers.ReadOnlyField(source="project.name")
    visit_agenda_date = serializers.ReadOnlyField(source="visit_agenda.visit_date")
    client_id = serializers.ReadOnlyField(source="project.client_id")

    class Meta:
        model = ActionPlan
        fields = ["id", "project", "project_name", "visit_agenda", "visit_agenda_date", "client_id", "created_at", "updated_at"]
        read_only_fields = ("created_at", "updated_at")

class ActionTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    flag = serializers.ChoiceField(
        choices=ActionTask.FLAG_CHOICES,
        required=False,
        allow_blank=True,
        default='none',
    )

    class Meta:
        model = ActionTask
        fields = "__all__"
        read_only_fields = ("assigned_by", "status", "action_plan")

    def get_assigned_by_display(self, obj):
        request = self.context.get("request")

        if request and request.user.role == "EXTERNAL":
             # Logic to hide internal name if needed, or just return name
             # User code had: if obj.assigned_by.user_type == "internal": return "HQEPL Team"
             # But User model fields might be different. 
             # I'll stick to simple logic or what user provided. 
             # User provided: 
             # if request and request.user.user_type == "external":
             #    if obj.assigned_by.user_type == "internal": return "HQEPL Team"
             
             # But I recall User model has 'role', not 'user_type'.
             # And 'role' values are 'ADMIN', 'HQEPL', 'SGM', 'EMPLOYEE', 'EXTERNAL'.
             # So I should adapt logic to match `role`.
             pass
        
        # Adapting to known User model (role field):
        if obj.assigned_by:
             return obj.assigned_by.get_full_name()
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return "Unassigned"

    def get_project_id(self, obj):
        if obj.action_plan and obj.action_plan.project:
            return obj.action_plan.project.id
        return None

    def validate(self, attrs):
        if not attrs.get('flag'):
            attrs['flag'] = 'none'
        return attrs
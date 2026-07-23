from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Department(models.Model):
    """Organisational department (e.g. HR, Engineering, Sales)."""
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    ADMIN = "ADMIN"
    KAYAARA = "KAYAARA"
    MLS = "MLS"
    SGM = "SGM"
    EMPLOYEE = "EMPLOYEE"
    CLIENT = "CLIENT"
    EXTERNAL = "EXTERNAL"
    SENIOR = "SENIOR"
    FREELANCER = "FREELANCER"
    VENDOR = "VENDOR"
    GUEST = "GUEST"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (KAYAARA, "KAYAARA"),
        (MLS, "MLS"),
        (SGM, "SGM"),
        (EMPLOYEE, "Employee"),
        (CLIENT, "Client"),
        (EXTERNAL, "External"),
        (SENIOR, "Senior"),
        (FREELANCER, "Freelancer"),
        (VENDOR, "Vendor"),
        (GUEST, "Guest"),
    ]

    # Department-level role choices
    DEPT_HOD = "HOD"
    DEPT_MANAGER = "MANAGER"
    DEPT_EMPLOYEE = "EMPLOYEE"

    DEPARTMENT_ROLE_CHOICES = [
        (DEPT_HOD, "HOD"),
        (DEPT_MANAGER, "Manager"),
        (DEPT_EMPLOYEE, "Employee"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES,  default='EMPLOYEE')
    shortform = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(unique=True)

    # Department affiliation
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members',
    )
    department_role = models.CharField(
        max_length=20,
        choices=DEPARTMENT_ROLE_CHOICES,
        null=True,
        blank=True,
    )

    # Shared profile fields used by all role-based profile pages.
    phone_number = models.CharField(max_length=10, blank=True, null=True)
    experience = models.CharField(max_length=255, blank=True, null=True)
    expertise = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    password_changed_at = models.DateTimeField(default=timezone.now)
    plain_password = models.CharField(max_length=255, blank=True, default='')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def set_password(self, raw_password):
        super().set_password(raw_password)
        self.password_changed_at = timezone.now()
        self.plain_password = str(raw_password or '')

    def __str__(self):
        return f"{self.email} ({self.role})"


class AuditLog(models.Model):
    """Records security-relevant user events (login, logout, password change)."""

    # Action choices
    USER_LOGIN = 'USER_LOGIN'
    USER_LOGOUT = 'USER_LOGOUT'
    FAILED_LOGIN = 'FAILED_LOGIN'
    PASSWORD_CHANGED = 'PASSWORD_CHANGED'
    TASK_CREATED = 'TASK_CREATED'
    TASK_COMPLETED = 'TASK_COMPLETED'
    CLIENT_CREATED = 'CLIENT_CREATED'
    PROJECT_CREATED = 'PROJECT_CREATED'
    TASK_UPDATED = 'TASK_UPDATED'
    TASK_DELETED = 'TASK_DELETED'

    ACTION_CHOICES = [
        (USER_LOGIN, 'User Login'),
        (USER_LOGOUT, 'User Logout'),
        (FAILED_LOGIN, 'Failed Login'),
        (PASSWORD_CHANGED, 'Password Changed'),
        (TASK_CREATED, 'Task Created'),
        (TASK_COMPLETED, 'Task Completed'),
        (CLIENT_CREATED, 'Client Created'),
        (PROJECT_CREATED, 'Project Created'),
        (TASK_UPDATED, 'Task Updated'),
        (TASK_DELETED, 'Task Deleted'),
    ]

    # Status choices
    SUCCESS = 'success'
    FAILED = 'failed'
    WARNING = 'warning'

    STATUS_CHOICES = [
        (SUCCESS, 'Success'),
        (FAILED, 'Failed'),
        (WARNING, 'Warning'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    details = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=SUCCESS)
    email_attempted = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        who = self.user.email if self.user else (self.email_attempted or 'Unknown')
        return f"[{self.get_action_display()}] {who} @ {self.timestamp:%Y-%m-%d %H:%M}"

    # ------------------------------------------------------------------
    # Helper to extract client IP from a Django request object.
    # ------------------------------------------------------------------
    @staticmethod
    def _get_client_ip(request):
        if request is None:
            return None
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

    # ------------------------------------------------------------------
    # Convenience factory – call from serializers / views.
    # ------------------------------------------------------------------
    @classmethod
    def log_event(cls, *, action, request=None, user=None, details='',
                  status=None, email_attempted=''):
        if status is None:
            status = cls.FAILED if action == cls.FAILED_LOGIN else cls.SUCCESS

        ip = cls._get_client_ip(request)
        ua = ''
        if request is not None:
            ua = request.META.get('HTTP_USER_AGENT', '')

        return cls.objects.create(
            user=user,
            action=action,
            ip_address=ip,
            user_agent=ua,
            details=details,
            status=status,
            email_attempted=email_attempted,
        )


class Permission(models.Model):
    """
    Granular permission definition.
    Examples: 'projects.view', 'projects.create', 'tasks.delete', 'users.invite'
    """

    CATEGORY_CHOICES = [
        ('projects', 'Projects'),
        ('tasks', 'Tasks & Milestones'),
        ('users', 'Users & Roles'),
        ('reports', 'Reports & Analytics'),
        ('clients', 'Clients'),
        ('organization', 'Organization'),
        ('workspace', 'Workspace'),
        ('notifications', 'Notifications'),
    ]

    codename = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Dot-notation permission identifier, e.g. 'projects.create'"
    )
    name = models.CharField(max_length=200, help_text="Human-readable name")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['category', 'codename']
        verbose_name = 'Permission'
        verbose_name_plural = 'Permissions'

    def __str__(self):
        return f"{self.codename} ({self.name})"


class RolePermissionTemplate(models.Model):
    """
    Maps a role to a permission with a scope level.
    This defines the default permission matrix for the system.
    """

    SCOPE_CHOICES = [
        ('all', 'All'),              # Full access to all resources
        ('assigned', 'Assigned'),    # Only resources assigned to user
        ('owned', 'Owned'),          # Only resources created/owned by user
        ('project', 'Project'),      # All resources within assigned projects
        ('denied', 'Denied'),        # Explicitly denied
    ]

    # Can be a system role (ADMIN, SGM, etc.) or org/workspace role (org_admin, workspace_manager)
    role = models.CharField(max_length=30, db_index=True)
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_templates'
    )
    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='denied',
        help_text="Access scope for this permission"
    )

    class Meta:
        unique_together = ['role', 'permission']
        ordering = ['role', 'permission__category', 'permission__codename']
        verbose_name = 'Role Permission Template'
        verbose_name_plural = 'Role Permission Templates'

    def __str__(self):
        return f"{self.role} | {self.permission.codename} = {self.scope}"

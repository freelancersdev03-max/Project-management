from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError


class OrganizationManager(models.Manager):
    """Manager that automatically filters by current organization context."""

    def get_queryset(self):
        from organizations.middleware import get_current_organization
        org = get_current_organization()
        if org:
            return super().get_queryset().filter(organization=org)
        return super().get_queryset()


class Organization(models.Model):
    """
    Top-level tenant entity. Each organization is completely isolated.
    Created by Super Admin. Contains organization admins, settings, billing.
    """

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    logo = models.ImageField(upload_to='org_logos/', blank=True, null=True)

    # Company details
    industry = models.CharField(max_length=100, blank=True)
    company_size = models.PositiveIntegerField(null=True, blank=True, help_text="Number of employees")
    country = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')

    # Working hours configuration
    working_days = models.JSONField(
        default=list,
        blank=True,
        help_text="List of working day indices (0=Monday, 6=Sunday)"
    )
    working_hours_start = models.TimeField(null=True, blank=True)
    working_hours_end = models.TimeField(null=True, blank=True)

    # Holiday calendar (can reference a HolidayCalendar model later)
    holiday_calendar = models.JSONField(default=dict, blank=True)

    # Settings
    is_active = models.BooleanField(default=True)
    allow_self_signup = models.BooleanField(default=False)
    max_users = models.PositiveIntegerField(null=True, blank=True)
    max_projects = models.PositiveIntegerField(null=True, blank=True)
    max_workspaces = models.PositiveIntegerField(null=True, blank=True)

    # Billing/Subscription (placeholder for future)
    subscription_plan = models.CharField(max_length=50, blank=True, default='free')
    subscription_expires = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_organizations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'

    def __str__(self):
        return self.name

    def clean(self):
        if self.working_days:
            for day in self.working_days:
                if not isinstance(day, int) or day < 0 or day > 6:
                    raise ValidationError("working_days must be a list of integers 0-6")

    @property
    def is_subscription_active(self):
        if not self.subscription_expires:
            return True
        return self.subscription_expires > timezone.now()

    def get_active_workspaces_count(self):
        return self.workspaces.filter(is_active=True).count()

    def get_total_users_count(self):
        return self.memberships.filter(is_active=True).count()


class Workspace(models.Model):
    """
    Workspace within an organization (e.g., IT Department, HR, Marketing).
    Phase 1: Single workspace per organization. Phase 2: Multiple workspaces.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='workspaces'
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#0086FF', help_text="Hex color code")
    icon = models.CharField(max_length=50, blank=True, help_text="Lucide icon name")

    # Workspace settings
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False, help_text="Default workspace for new members")

    # Permissions
    allow_cross_workspace_projects = models.BooleanField(default=False)
    allow_cross_workspace_teams = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workspaces'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'name']
        unique_together = ['organization', 'slug']
        verbose_name = 'Workspace'
        verbose_name_plural = 'Workspaces'

    def __str__(self):
        return f"{self.organization.name} / {self.name}"

    def save(self, *args, **kwargs):
        # Ensure only one default workspace per organization
        if self.is_default:
            Workspace.objects.filter(
                organization=self.organization,
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @property
    def member_count(self):
        return self.memberships.filter(is_active=True).count()

    @property
    def project_count(self):
        return self.projects.filter(is_active=True).count() if hasattr(self, 'projects') else 0


class OrganizationMembership(models.Model):
    """
    Links users to organizations with organization-level roles.
    A user can belong to multiple organizations with different roles.
    """

    ROLE_CHOICES = [
        ('org_admin', 'Organization Admin'),      # Full org access, manage workspaces, users, billing
        ('org_member', 'Organization Member'),    # Basic access, assigned to workspaces
        ('org_viewer', 'Organization Viewer'),    # Read-only org-wide access
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organization_memberships'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='org_member')
    is_active = models.BooleanField(default=True)

    # Invitation tracking
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='org_invitations_sent'
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    joined_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'organization']
        ordering = ['-created_at']
        verbose_name = 'Organization Membership'
        verbose_name_plural = 'Organization Memberships'

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.get_role_display()})"

    @property
    def is_org_admin(self):
        return self.role == 'org_admin'

    @property
    def can_manage_organization(self):
        return self.role in ['org_admin']


class WorkspaceMembership(models.Model):
    """
    Links users to workspaces with workspace-level roles.
    Users must be org members before joining a workspace.
    """

    ROLE_CHOICES = [
        ('workspace_admin', 'Workspace Admin'),    # Manage workspace, projects, members
        ('workspace_manager', 'Workspace Manager'), # Manage projects, tasks, team
        ('workspace_member', 'Workspace Member'),   # Work on assigned projects/tasks
        ('workspace_viewer', 'Workspace Viewer'),   # Read-only access
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_memberships'
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='workspace_member')
    is_active = models.BooleanField(default=True)

    # Department/Team within workspace
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)

    # Manager hierarchy
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subordinates'
    )

    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'workspace']
        ordering = ['-joined_at']
        verbose_name = 'Workspace Membership'
        verbose_name_plural = 'Workspace Memberships'

    def __str__(self):
        return f"{self.user.email} - {self.workspace.name} ({self.get_role_display()})"

    def clean(self):
        # Ensure user is a member of the workspace's organization
        if self.user_id and self.workspace_id:
            org_membership = OrganizationMembership.objects.filter(
                user=self.user,
                organization=self.workspace.organization,
                is_active=True
            ).first()
            if not org_membership:
                raise ValidationError("User must be an active member of the organization before joining a workspace.")

    @property
    def is_workspace_admin(self):
        return self.role == 'workspace_admin'

    @property
    def can_manage_workspace(self):
        return self.role in ['workspace_admin', 'workspace_manager']

    @property
    def can_create_projects(self):
        return self.role in ['workspace_admin', 'workspace_manager']


class OrganizationInvitation(models.Model):
    """Email invitations to join an organization."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
    ]

    email = models.EmailField()
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    role = models.CharField(max_length=20, choices=OrganizationMembership.ROLE_CHOICES, default='org_member')
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_org_invitations'
    )
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation for {self.email} to {self.organization.name}"

    def is_valid(self):
        return self.status == 'pending' and self.expires_at > timezone.now()


class WorkspaceInvitation(models.Model):
    """Email invitations to join a workspace."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
    ]

    email = models.EmailField()
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    role = models.CharField(max_length=20, choices=WorkspaceMembership.ROLE_CHOICES, default='workspace_member')
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_workspace_invitations'
    )
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation for {self.email} to {self.workspace.name}"

    def is_valid(self):
        return self.status == 'pending' and self.expires_at > timezone.now()
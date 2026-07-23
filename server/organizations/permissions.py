from rest_framework.permissions import BasePermission
from organizations.middleware import get_current_organization, get_current_workspace


class IsOrganizationAdmin(BasePermission):
    """
    Permission check for organization admin.
    Allows Super Admins and users with org_admin role in current organization.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Super admins have access to everything
        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        org = get_current_organization()
        if not org:
            return False

        # Check if user is org_admin in current organization
        return org.memberships.filter(
            user=request.user,
            role='org_admin',
            is_active=True
        ).exists()


class IsOrganizationMember(BasePermission):
    """
    Permission check for organization member.
    Allows any active member of the current organization.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        org = get_current_organization()
        if not org:
            return False

        return org.memberships.filter(
            user=request.user,
            is_active=True
        ).exists()


class IsWorkspaceAdmin(BasePermission):
    """
    Permission check for workspace admin.
    Allows Super Admins, org_admins, and workspace_admins in current workspace.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        workspace = get_current_workspace()
        if not workspace:
            return False

        # Org admins can manage workspaces
        org = workspace.organization
        if org.memberships.filter(
            user=request.user,
            role='org_admin',
            is_active=True
        ).exists():
            return True

        # Check workspace_admin role
        return workspace.memberships.filter(
            user=request.user,
            role='workspace_admin',
            is_active=True
        ).exists()


class IsWorkspaceManager(BasePermission):
    """
    Permission check for workspace manager or admin.
    Allows workspace_admin and workspace_manager roles.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        workspace = get_current_workspace()
        if not workspace:
            return False

        # Org admins have access
        org = workspace.organization
        if org.memberships.filter(
            user=request.user,
            role='org_admin',
            is_active=True
        ).exists():
            return True

        # Check workspace roles
        return workspace.memberships.filter(
            user=request.user,
            role__in=['workspace_admin', 'workspace_manager'],
            is_active=True
        ).exists()


class IsWorkspaceMember(BasePermission):
    """
    Permission check for any active workspace member.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        workspace = get_current_workspace()
        if not workspace:
            return False

        return workspace.memberships.filter(
            user=request.user,
            is_active=True
        ).exists()


class CanCreateProjectInWorkspace(BasePermission):
    """
    Check if user can create projects in the current workspace.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        workspace = get_current_workspace()
        if not workspace:
            return False

        # Org admins can create projects
        org = workspace.organization
        if org.memberships.filter(
            user=request.user,
            role='org_admin',
            is_active=True
        ).exists():
            return True

        # Check workspace role
        membership = workspace.memberships.filter(
            user=request.user,
            is_active=True
        ).first()

        if membership and membership.role in ['workspace_admin', 'workspace_manager']:
            return True

        return False


class CanManageWorkspaceMembers(BasePermission):
    """
    Check if user can manage members in workspace.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        workspace = get_current_workspace()
        if not workspace:
            return False

        org = workspace.organization
        if org.memberships.filter(
            user=request.user,
            role='org_admin',
            is_active=True
        ).exists():
            return True

        return workspace.memberships.filter(
            user=request.user,
            role='workspace_admin',
            is_active=True
        ).exists()


class OrganizationObjectPermission(BasePermission):
    """
    Object-level permission for organization-scoped objects.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        org = get_current_organization()
        if not org:
            return False

        # Check if object belongs to current organization
        if hasattr(obj, 'organization'):
            return obj.organization == org
        elif hasattr(obj, 'workspace') and hasattr(obj.workspace, 'organization'):
            return obj.workspace.organization == org

        return False


class WorkspaceObjectPermission(BasePermission):
    """
    Object-level permission for workspace-scoped objects.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == 'ADMIN':
            return True

        workspace = get_current_workspace()
        if not workspace:
            return False

        if hasattr(obj, 'workspace'):
            return obj.workspace == workspace
        elif hasattr(obj, 'project') and hasattr(obj.project, 'workspace'):
            return obj.project.workspace == workspace

        return False
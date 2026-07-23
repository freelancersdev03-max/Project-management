"""
Middleware and utilities for organization/workspace context management.
This enables automatic filtering of querysets by the current organization.
"""

import threading
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model

# Thread-local storage for organization/workspace context
_org_context = threading.local()

User = get_user_model()


def get_current_organization():
    """Get the current organization from thread-local context."""
    return getattr(_org_context, 'organization', None)


def set_current_organization(organization):
    """Set the current organization in thread-local context."""
    _org_context.organization = organization


def clear_current_organization():
    """Clear the current organization from thread-local context."""
    if hasattr(_org_context, 'organization'):
        del _org_context.organization


def get_current_workspace():
    """Get the current workspace from thread-local context."""
    return getattr(_org_context, 'workspace', None)


def set_current_workspace(workspace):
    """Set the current workspace in thread-local context."""
    _org_context.workspace = workspace


def clear_current_workspace():
    """Clear the current workspace from thread-local context."""
    if hasattr(_org_context, 'workspace'):
        del _org_context.workspace


def get_current_org_membership(user=None):
    """Get the current user's organization membership."""
    if user is None:
        # Try to get from request context (set by middleware)
        request = getattr(_org_context, 'request', None)
        if request:
            user = request.user
        else:
            return None

    if not user or not user.is_authenticated:
        return None

    org = get_current_organization()
    if not org:
        return None

    return org.memberships.filter(user=user, is_active=True).first()


def get_current_workspace_membership(user=None):
    """Get the current user's workspace membership."""
    if user is None:
        request = getattr(_org_context, 'request', None)
        if request:
            user = request.user
        else:
            return None

    if not user or not user.is_authenticated:
        return None

    workspace = get_current_workspace()
    if not workspace:
        return None

    return workspace.memberships.filter(user=user, is_active=True).first()


class OrganizationMiddleware(MiddlewareMixin):
    """
    Middleware to set organization/workspace context from request.
    Determines organization from:
    1. Subdomain (org-slug.example.com)
    2. Header (X-Organization-Slug)
    3. User's default organization (if only one)
    4. Session storage
    """

    def process_request(self, request):
        # Store request in thread-local for access in utilities
        _org_context.request = request

        if not request.user.is_authenticated:
            return None

        # Get organization from various sources
        organization = self._resolve_organization(request)
        if organization:
            set_current_organization(organization)

            # Resolve workspace
            workspace = self._resolve_workspace(request, organization)
            if workspace:
                set_current_workspace(workspace)

        return None

    def process_response(self, request, response):
        # Clear thread-local context
        clear_current_organization()
        clear_current_workspace()
        if hasattr(_org_context, 'request'):
            del _org_context.request
        return response

    def _resolve_organization(self, request):
        """Resolve organization from request."""
        from organizations.models import Organization, OrganizationMembership

        # 1. Check subdomain
        host = request.get_host().split(':')[0]
        if '.' in host:
            subdomain = host.split('.')[0]
            if subdomain not in ['www', 'api', 'app', 'admin']:
                org = Organization.objects.filter(slug=subdomain, is_active=True).first()
                if org:
                    # Verify user has access
                    if self._user_has_org_access(request.user, org):
                        return org

        # 2. Check header (for API calls)
        org_slug = request.headers.get('X-Organization-Slug')
        if org_slug:
            org = Organization.objects.filter(slug=org_slug, is_active=True).first()
            if org and self._user_has_org_access(request.user, org):
                return org

        # 3. Check session
        session_org_id = request.session.get('organization_id')
        if session_org_id:
            org = Organization.objects.filter(id=session_org_id, is_active=True).first()
            if org and self._user_has_org_access(request.user, org):
                return org

        # 4. Use user's default/only organization
        memberships = OrganizationMembership.objects.filter(
            user=request.user,
            is_active=True
        ).select_related('organization')

        active_memberships = [m for m in memberships if m.organization.is_active]

        if len(active_memberships) == 1:
            org = active_memberships[0].organization
            request.session['organization_id'] = org.id
            return org
        elif len(active_memberships) > 1:
            # User has multiple orgs - they need to select one
            # Store available orgs in session for frontend
            request.session['available_organizations'] = [
                {'id': m.organization.id, 'name': m.organization.name, 'slug': m.organization.slug}
                for m in active_memberships
            ]
            # Don't auto-select - let frontend handle it

        return None

    def _resolve_workspace(self, request, organization):
        """Resolve workspace from request."""
        from organizations.models import Workspace, WorkspaceMembership

        # 1. Check header
        workspace_slug = request.headers.get('X-Workspace-Slug')
        if workspace_slug:
            workspace = Workspace.objects.filter(
                organization=organization,
                slug=workspace_slug,
                is_active=True
            ).first()
            if workspace and self._user_has_workspace_access(request.user, workspace):
                return workspace

        # 2. Check session
        session_ws_id = request.session.get('workspace_id')
        if session_ws_id:
            workspace = Workspace.objects.filter(
                id=session_ws_id,
                organization=organization,
                is_active=True
            ).first()
            if workspace and self._user_has_workspace_access(request.user, workspace):
                return workspace

        # 3. Use default workspace or user's only workspace
        memberships = WorkspaceMembership.objects.filter(
            user=request.user,
            workspace__organization=organization,
            is_active=True
        ).select_related('workspace')

        active_memberships = [m for m in memberships if m.workspace.is_active]

        if len(active_memberships) == 1:
            workspace = active_memberships[0].workspace
            request.session['workspace_id'] = workspace.id
            return workspace
        elif len(active_memberships) > 1:
            # Check for default workspace
            default_ws = next((m.workspace for m in active_memberships if m.workspace.is_default), None)
            if default_ws:
                request.session['workspace_id'] = default_ws.id
                return default_ws

        return None

    def _user_has_org_access(self, user, organization):
        """Check if user has access to organization."""
        if user.is_superuser or user.role == 'ADMIN':
            return True  # Super admins have access to all orgs
        return OrganizationMembership.objects.filter(
            user=user,
            organization=organization,
            is_active=True
        ).exists()

    def _user_has_workspace_access(self, user, workspace):
        """Check if user has access to workspace."""
        if user.is_superuser or user.role == 'ADMIN':
            return True
        return WorkspaceMembership.objects.filter(
            user=user,
            workspace=workspace,
            is_active=True
        ).exists()


class OrganizationQuerySetMixin:
    """
    Mixin to automatically filter querysets by current organization.
    Add to ViewSets to enable automatic org filtering.
    """

    def get_queryset(self):
        queryset = super().get_queryset()

        # Check if model has organization field
        model = queryset.model
        if hasattr(model, 'organization'):
            org = get_current_organization()
            if org:
                queryset = queryset.filter(organization=org)
            elif not self.request.user.is_superuser:
                # No org context and not superuser - return empty
                return model.objects.none()

        # Check for workspace field
        if hasattr(model, 'workspace'):
            ws = get_current_workspace()
            if ws:
                queryset = queryset.filter(workspace=ws)
            elif not self.request.user.is_superuser:
                return model.objects.none()

        return queryset


def get_org_filter_kwargs():
    """Get filter kwargs for current organization context."""
    kwargs = {}
    org = get_current_organization()
    if org:
        kwargs['organization'] = org
    ws = get_current_workspace()
    if ws:
        kwargs['workspace'] = ws
    return kwargs
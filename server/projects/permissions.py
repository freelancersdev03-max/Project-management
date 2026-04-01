from rest_framework.permissions import BasePermission
from .models import Project


# --------------------------------------
# Only Admins or SGM (internal managers) can access
# --------------------------------------
class IsAdminOrManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['ADMIN', 'SGM']


# --------------------------------------
# Client users or internal managers (SGM/HQEPL/Admin) can access
# --------------------------------------
class IsClientOrManager(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['CLIENT', 'SGM', 'HQEPL', 'MLS', 'ADMIN']


# --------------------------------------
# Only HQEPL (CEO/MD) can access
# --------------------------------------
class IsHQEPL(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['HQEPL', 'MLS']


# --------------------------------------
# Only Employees can access
# --------------------------------------
class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'EMPLOYEE'

class IsProjectMember(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        project_id = view.kwargs.get("project_id")

        if not project_id:
            return False

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return False

        # Global managers can access any project action task endpoint.
        if request.user.role in ['ADMIN', 'HQEPL', 'MLS']:
            return True

        # Client account can access their own projects.
        if request.user.role == 'CLIENT' and hasattr(request.user, 'client_profile'):
            return project.client_id == request.user.client_profile.id

        # SGM can access projects where they are directly assigned OR assigned to the client.
        if request.user.role == 'SGM':
            return (
                project.assigned_sgm_id == request.user.id
                or project.client.assigned_sgms.filter(id=request.user.id).exists()
            )

        if request.user.role == 'SENIOR':
            from clients.models import ExternalTeam
            client_ids = ExternalTeam.objects.filter(user=request.user).values_list('client_org_id', flat=True)
            return project.client_id in client_ids

        # Check internal team (Employee -> User)
        is_internal = project.assigned_employees.filter(user=request.user).exists()
        # Check external team (User)
        is_external = project.external_team.filter(id=request.user.id).exists()

        # Also allow SGM, External Lead, Creator if needed?
        # Assuming "Project Member" implies people working on it.
        # SGM and External Lead are usually members too.
        is_sgm = project.assigned_sgm == request.user
        is_lead = project.external_lead == request.user
        is_creator = project.created_by == request.user
        
        return is_internal or is_external or is_sgm or is_lead or is_creator


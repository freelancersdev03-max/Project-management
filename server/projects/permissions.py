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
        return request.user.role in ['CLIENT', 'SGM', 'HQEPL', 'ADMIN']


# --------------------------------------
# Only HQEPL (CEO/MD) can access
# --------------------------------------
class IsHQEPL(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'HQEPL'


# --------------------------------------
# Only Employees can access
# --------------------------------------
class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'EMPLOYEE'

class IsProjectMember(BasePermission):
    def has_permission(self, request, view):
        project_id = view.kwargs.get("project_id")

        if not project_id:
            return False

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return False

        # Check internal team (Employee -> User)
        is_internal = project.assigned_employees.filter(user=request.user).exists()
        # Check external team (User)
        is_external = project.external_team.filter(id=request.user.id).exists()

        # Also allow SGM, External Lead, Creator if needed?
        # Assuming "Project Member" implies people working on it.
        # SGM and External Lead are usually members too.
        is_sgm = project.assigned_sgm == request.user
        is_lead = project.external_lead == request.user
        
        return is_internal or is_external or is_sgm or is_lead


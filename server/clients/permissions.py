from rest_framework.permissions import BasePermission

class IsAdminOrHQEPL(BasePermission):
    """
    Allows access only to users with role ADMIN, HQEPL, or MLS.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ["ADMIN", "HQEPL", "MLS"]
        )

class IsClient(BasePermission):
    """
    Allows access only to CLIENT users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "CLIENT"

class IsExternalMember(BasePermission):
    """
    Allows access only to EXTERNAL users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "EXTERNAL"

class IsClientOrAdminHQEPL(BasePermission):
    """
    Client can access their own profile, Admin/HQEPL/MLS can access all.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role in ["ADMIN", "HQEPL", "MLS"]:
            return True
        if request.user.role == "CLIENT" and hasattr(obj, "user"):
            return obj.user == request.user
        return False

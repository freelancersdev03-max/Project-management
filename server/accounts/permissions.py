from rest_framework.permissions import BasePermission
from .models import CustomUser


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.ADMIN
        )


class IsKAYAARA(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [CustomUser.KAYAARA, CustomUser.MLS]
        )


class IsSGM(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.SGM
        )


class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.EMPLOYEE
        )

class IsInternalUser(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                CustomUser.ADMIN,
                CustomUser.KAYAARA,
                CustomUser.SGM,
                CustomUser.EMPLOYEE,
            ]
        )

class IsAdminOrKAYAARA(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                CustomUser.ADMIN,
                CustomUser.KAYAARA,
            ]
        )


class HasPermission(BasePermission):
    """
    Dynamic permission check against RolePermissionTemplate for a given codename.
    Can be instantiated with a codename: permission_classes = [HasPermission('projects.create')]
    """

    def __init__(self, codename=None):
        self.codename = codename

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser or request.user.role == CustomUser.ADMIN:
            return True

        codename = self.codename or getattr(view, 'required_permission', None)
        if not codename:
            return True

        from .models import RolePermissionTemplate
        tmpl = RolePermissionTemplate.objects.filter(
            role=request.user.role,
            permission__codename=codename
        ).first()

        if not tmpl:
            return False

        return tmpl.scope != 'denied'
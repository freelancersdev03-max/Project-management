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
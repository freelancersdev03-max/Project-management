from rest_framework.permissions import BasePermission
from .models import CustomUser


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == CustomUser.ADMIN
        )


class IsHQEPL(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [CustomUser.HQEPL, CustomUser.MLS]
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
                CustomUser.HQEPL,
                CustomUser.SGM,
                CustomUser.EMPLOYEE,
            ]
        )

class IsAdminOrHQEPL(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                CustomUser.ADMIN,
                CustomUser.HQEPL,
            ]
        )
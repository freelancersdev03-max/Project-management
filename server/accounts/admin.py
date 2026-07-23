from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Department, Permission, RolePermissionTemplate


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ['codename', 'name', 'category']
    list_filter = ['category']
    search_fields = ['codename', 'name']


@admin.register(RolePermissionTemplate)
class RolePermissionTemplateAdmin(admin.ModelAdmin):
    list_display = ['role', 'permission', 'scope']
    list_filter = ['role', 'scope', 'permission__category']
    search_fields = ['role', 'permission__codename']


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'shortform', 'role', 'department', 'department_role', 'is_staff', 'is_active']
    list_filter = ['role', 'department', 'department_role', 'is_staff', 'is_active']
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password', 'shortform', 'role')}),
        ('Department', {'fields': ('department', 'department_role')}),
        ('Permissions', {'fields': ('is_staff', 'is_active')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'shortform', 'role', 'department', 'department_role', 'password1', 'password2', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('email',)
    ordering = ('email',)

admin.site.register(CustomUser, CustomUserAdmin)



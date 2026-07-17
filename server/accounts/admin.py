from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']


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


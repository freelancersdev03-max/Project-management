"""
Management command to seed the Permission table and default RolePermissionTemplate entries.

Usage:
    python manage.py seed_permissions
    python manage.py seed_permissions --reset   # Deletes existing and re-creates
"""

from django.core.management.base import BaseCommand
from accounts.models import Permission, RolePermissionTemplate


# Permission definitions: (codename, name, category)
PERMISSIONS = [
    # Projects
    ('projects.view', 'View Projects', 'projects'),
    ('projects.create', 'Create Projects', 'projects'),
    ('projects.edit', 'Edit Projects', 'projects'),
    ('projects.delete', 'Delete Projects', 'projects'),
    ('projects.assign_members', 'Assign Project Members', 'projects'),
    ('projects.view_budget', 'View Project Budget', 'projects'),
    ('projects.manage_milestones', 'Manage Milestones', 'projects'),

    # Tasks & Milestones
    ('tasks.view', 'View Tasks', 'tasks'),
    ('tasks.create', 'Create Tasks', 'tasks'),
    ('tasks.edit', 'Edit Tasks', 'tasks'),
    ('tasks.delete', 'Delete Tasks', 'tasks'),
    ('tasks.approve', 'Approve Tasks', 'tasks'),
    ('tasks.assign', 'Assign Tasks', 'tasks'),
    ('tasks.change_status', 'Change Task Status', 'tasks'),

    # Users & Roles
    ('users.view_directory', 'View Internal Directory', 'users'),
    ('users.invite', 'Invite Users', 'users'),
    ('users.manage', 'Manage Users', 'users'),
    ('users.assign_roles', 'Assign Roles', 'users'),
    ('users.deactivate', 'Deactivate Users', 'users'),

    # Reports & Analytics
    ('reports.view_system_kpis', 'View System KPIs', 'reports'),
    ('reports.view_project', 'View Project Reports', 'reports'),
    ('reports.export', 'Export Reports', 'reports'),
    ('reports.view_dashboard', 'View Company Dashboard', 'reports'),

    # Clients
    ('clients.view', 'View Clients', 'clients'),
    ('clients.create', 'Create Clients', 'clients'),
    ('clients.edit', 'Edit Clients', 'clients'),
    ('clients.delete', 'Delete Clients', 'clients'),

    # Organization
    ('organization.manage_settings', 'Manage Organization Settings', 'organization'),
    ('organization.manage_billing', 'Manage Billing', 'organization'),
    ('organization.view_audit_log', 'View Audit Log', 'organization'),

    # Workspace
    ('workspace.create', 'Create Workspaces', 'workspace'),
    ('workspace.manage_members', 'Manage Workspace Members', 'workspace'),
    ('workspace.manage_settings', 'Manage Workspace Settings', 'workspace'),

    # Notifications
    ('notifications.manage_channels', 'Manage Notification Channels', 'notifications'),
]

# Default role permission matrix:
# Format: {role: {codename: scope}}
ROLE_MATRIX = {
    'ADMIN': {
        'projects.view': 'all', 'projects.create': 'all', 'projects.edit': 'all',
        'projects.delete': 'all', 'projects.assign_members': 'all',
        'projects.view_budget': 'all', 'projects.manage_milestones': 'all',
        'tasks.view': 'all', 'tasks.create': 'all', 'tasks.edit': 'all',
        'tasks.delete': 'all', 'tasks.approve': 'all', 'tasks.assign': 'all',
        'tasks.change_status': 'all',
        'users.view_directory': 'all', 'users.invite': 'all', 'users.manage': 'all',
        'users.assign_roles': 'all', 'users.deactivate': 'all',
        'reports.view_system_kpis': 'all', 'reports.view_project': 'all',
        'reports.export': 'all', 'reports.view_dashboard': 'all',
        'clients.view': 'all', 'clients.create': 'all', 'clients.edit': 'all',
        'clients.delete': 'all',
        'organization.manage_settings': 'all', 'organization.manage_billing': 'all',
        'organization.view_audit_log': 'all',
        'workspace.create': 'all', 'workspace.manage_members': 'all',
        'workspace.manage_settings': 'all',
        'notifications.manage_channels': 'all',
    },
    'KAYAARA': {
        'projects.view': 'all', 'projects.create': 'all', 'projects.edit': 'all',
        'projects.delete': 'denied', 'projects.assign_members': 'all',
        'projects.view_budget': 'all', 'projects.manage_milestones': 'all',
        'tasks.view': 'all', 'tasks.create': 'all', 'tasks.edit': 'all',
        'tasks.delete': 'denied', 'tasks.approve': 'all', 'tasks.assign': 'all',
        'tasks.change_status': 'all',
        'users.view_directory': 'all', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'all', 'reports.view_project': 'all',
        'reports.export': 'all', 'reports.view_dashboard': 'all',
        'clients.view': 'all', 'clients.create': 'all', 'clients.edit': 'all',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'all',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'MLS': {
        'projects.view': 'all', 'projects.create': 'all', 'projects.edit': 'all',
        'projects.delete': 'denied', 'projects.assign_members': 'all',
        'projects.view_budget': 'all', 'projects.manage_milestones': 'all',
        'tasks.view': 'all', 'tasks.create': 'all', 'tasks.edit': 'all',
        'tasks.delete': 'denied', 'tasks.approve': 'all', 'tasks.assign': 'all',
        'tasks.change_status': 'all',
        'users.view_directory': 'all', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'all', 'reports.view_project': 'all',
        'reports.export': 'all', 'reports.view_dashboard': 'all',
        'clients.view': 'all', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'SGM': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'assigned',
        'projects.delete': 'denied', 'projects.assign_members': 'assigned',
        'projects.view_budget': 'assigned', 'projects.manage_milestones': 'assigned',
        'tasks.view': 'project', 'tasks.create': 'all', 'tasks.edit': 'project',
        'tasks.delete': 'denied', 'tasks.approve': 'project', 'tasks.assign': 'project',
        'tasks.change_status': 'project',
        'users.view_directory': 'all', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'assigned',
        'reports.export': 'assigned', 'reports.view_dashboard': 'denied',
        'clients.view': 'assigned', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'EMPLOYEE': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'denied', 'projects.manage_milestones': 'denied',
        'tasks.view': 'assigned', 'tasks.create': 'denied', 'tasks.edit': 'assigned',
        'tasks.delete': 'denied', 'tasks.approve': 'denied', 'tasks.assign': 'denied',
        'tasks.change_status': 'assigned',
        'users.view_directory': 'all', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'denied',
        'reports.export': 'denied', 'reports.view_dashboard': 'denied',
        'clients.view': 'denied', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'CLIENT': {
        'projects.view': 'owned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'owned', 'projects.manage_milestones': 'denied',
        'tasks.view': 'project', 'tasks.create': 'denied', 'tasks.edit': 'denied',
        'tasks.delete': 'denied', 'tasks.approve': 'project', 'tasks.assign': 'denied',
        'tasks.change_status': 'denied',
        'users.view_directory': 'denied', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'owned',
        'reports.export': 'owned', 'reports.view_dashboard': 'denied',
        'clients.view': 'owned', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'SENIOR': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'denied', 'projects.manage_milestones': 'denied',
        'tasks.view': 'project', 'tasks.create': 'denied', 'tasks.edit': 'denied',
        'tasks.delete': 'denied', 'tasks.approve': 'project', 'tasks.assign': 'denied',
        'tasks.change_status': 'denied',
        'users.view_directory': 'denied', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'assigned',
        'reports.export': 'denied', 'reports.view_dashboard': 'denied',
        'clients.view': 'denied', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'EXTERNAL': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'denied', 'projects.manage_milestones': 'denied',
        'tasks.view': 'assigned', 'tasks.create': 'denied', 'tasks.edit': 'assigned',
        'tasks.delete': 'denied', 'tasks.approve': 'denied', 'tasks.assign': 'denied',
        'tasks.change_status': 'assigned',
        'users.view_directory': 'denied', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'denied',
        'reports.export': 'denied', 'reports.view_dashboard': 'denied',
        'clients.view': 'denied', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'FREELANCER': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'denied', 'projects.manage_milestones': 'denied',
        'tasks.view': 'assigned', 'tasks.create': 'denied', 'tasks.edit': 'assigned',
        'tasks.delete': 'denied', 'tasks.approve': 'denied', 'tasks.assign': 'denied',
        'tasks.change_status': 'assigned',
        'users.view_directory': 'denied', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'denied',
        'reports.export': 'denied', 'reports.view_dashboard': 'denied',
        'clients.view': 'denied', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'VENDOR': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'denied', 'projects.manage_milestones': 'denied',
        'tasks.view': 'assigned', 'tasks.create': 'denied', 'tasks.edit': 'denied',
        'tasks.delete': 'denied', 'tasks.approve': 'denied', 'tasks.assign': 'denied',
        'tasks.change_status': 'denied',
        'users.view_directory': 'denied', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'assigned',
        'reports.export': 'denied', 'reports.view_dashboard': 'denied',
        'clients.view': 'denied', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
    'GUEST': {
        'projects.view': 'assigned', 'projects.create': 'denied', 'projects.edit': 'denied',
        'projects.delete': 'denied', 'projects.assign_members': 'denied',
        'projects.view_budget': 'denied', 'projects.manage_milestones': 'denied',
        'tasks.view': 'assigned', 'tasks.create': 'denied', 'tasks.edit': 'denied',
        'tasks.delete': 'denied', 'tasks.approve': 'denied', 'tasks.assign': 'denied',
        'tasks.change_status': 'denied',
        'users.view_directory': 'denied', 'users.invite': 'denied', 'users.manage': 'denied',
        'users.assign_roles': 'denied', 'users.deactivate': 'denied',
        'reports.view_system_kpis': 'denied', 'reports.view_project': 'denied',
        'reports.export': 'denied', 'reports.view_dashboard': 'denied',
        'clients.view': 'denied', 'clients.create': 'denied', 'clients.edit': 'denied',
        'clients.delete': 'denied',
        'organization.manage_settings': 'denied', 'organization.manage_billing': 'denied',
        'organization.view_audit_log': 'denied',
        'workspace.create': 'denied', 'workspace.manage_members': 'denied',
        'workspace.manage_settings': 'denied',
        'notifications.manage_channels': 'denied',
    },
}


class Command(BaseCommand):
    help = 'Seed Permission and RolePermissionTemplate tables with default values.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing permissions and re-create',
        )

    def handle(self, *args, **options):
        if options['reset']:
            RolePermissionTemplate.objects.all().delete()
            Permission.objects.all().delete()
            self.stdout.write(self.style.WARNING('[RESET] Cleared existing permissions.'))

        # 1. Create Permission entries
        perm_count = 0
        for codename, name, category in PERMISSIONS:
            _, created = Permission.objects.get_or_create(
                codename=codename,
                defaults={'name': name, 'category': category}
            )
            if created:
                perm_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'[OK] Permissions: {perm_count} created ({len(PERMISSIONS)} total defined)'
        ))

        # 2. Create RolePermissionTemplate entries
        template_count = 0
        for role, perms in ROLE_MATRIX.items():
            for codename, scope in perms.items():
                try:
                    perm = Permission.objects.get(codename=codename)
                    _, created = RolePermissionTemplate.objects.get_or_create(
                        role=role,
                        permission=perm,
                        defaults={'scope': scope}
                    )
                    if created:
                        template_count += 1
                except Permission.DoesNotExist:
                    self.stdout.write(self.style.ERROR(
                        f'[ERR] Permission not found: {codename}'
                    ))

        self.stdout.write(self.style.SUCCESS(
            f'[OK] Role templates: {template_count} created'
        ))
        self.stdout.write(self.style.SUCCESS('[DONE] Permission seeding complete!'))

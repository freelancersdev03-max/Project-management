"""
Management command to create a default Organization and Workspace,
and enroll all existing users as members.

Usage:
    python manage.py setup_default_org
    python manage.py setup_default_org --org-name "My Company" --ws-name "General"
"""

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from accounts.models import CustomUser
from organizations.models import (
    Organization, Workspace,
    OrganizationMembership, WorkspaceMembership
)


class Command(BaseCommand):
    help = 'Create a default Organization and Workspace, and enroll all existing users.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-name',
            type=str,
            default='Default Organization',
            help='Name for the default organization',
        )
        parser.add_argument(
            '--ws-name',
            type=str,
            default='General',
            help='Name for the default workspace',
        )

    def handle(self, *args, **options):
        org_name = options['org_name']
        ws_name = options['ws_name']

        # ----- 1. Create or get the Organization -----
        org_slug = slugify(org_name)
        org, org_created = Organization.objects.get_or_create(
            slug=org_slug,
            defaults={
                'name': org_name,
                'is_active': True,
                'working_days': [0, 1, 2, 3, 4],  # Mon-Fri
                'timezone': 'Asia/Kolkata',
            }
        )
        if org_created:
            self.stdout.write(self.style.SUCCESS(f'[OK] Created organization: {org.name} (slug: {org.slug})'))
        else:
            self.stdout.write(self.style.WARNING(f'[SKIP] Organization already exists: {org.name}'))

        # ----- 2. Create or get the default Workspace -----
        ws_slug = slugify(ws_name)
        workspace, ws_created = Workspace.objects.get_or_create(
            organization=org,
            slug=ws_slug,
            defaults={
                'name': ws_name,
                'is_active': True,
                'is_default': True,
                'color': '#0086FF',
            }
        )
        if ws_created:
            self.stdout.write(self.style.SUCCESS(f'[OK] Created workspace: {workspace.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'[SKIP] Workspace already exists: {workspace.name}'))

        # ----- 3. Enroll all existing users -----
        users = CustomUser.objects.all()
        org_created_count = 0
        ws_created_count = 0

        for user in users:
            # Determine org role based on existing user role
            if user.role == CustomUser.ADMIN or user.is_superuser:
                org_role = 'org_admin'
                ws_role = 'workspace_admin'
            elif user.role in [CustomUser.KAYAARA, CustomUser.MLS]:
                org_role = 'org_admin'
                ws_role = 'workspace_admin'
            elif user.role == CustomUser.SGM:
                org_role = 'org_member'
                ws_role = 'workspace_manager'
            else:
                org_role = 'org_member'
                ws_role = 'workspace_member'

            # Create org membership
            _, created = OrganizationMembership.objects.get_or_create(
                user=user,
                organization=org,
                defaults={
                    'role': org_role,
                    'is_active': True,
                }
            )
            if created:
                org_created_count += 1

            # Create workspace membership
            _, created = WorkspaceMembership.objects.get_or_create(
                user=user,
                workspace=workspace,
                defaults={
                    'role': ws_role,
                    'is_active': True,
                }
            )
            if created:
                ws_created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'[OK] Organization memberships: {org_created_count} created '
            f'({users.count()} total users)'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'[OK] Workspace memberships: {ws_created_count} created'
        ))
        self.stdout.write(self.style.SUCCESS('\n[DONE] Default org/workspace setup complete!'))

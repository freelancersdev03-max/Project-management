from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.conf import settings

from .models import (
    Organization, OrganizationMembership, OrganizationInvitation,
    Workspace, WorkspaceMembership, WorkspaceInvitation
)
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer,
    OrganizationMembershipSerializer, OrganizationMembershipUpdateSerializer,
    OrganizationInvitationSerializer,
    WorkspaceSerializer, WorkspaceCreateSerializer,
    WorkspaceMembershipSerializer, WorkspaceMembershipUpdateSerializer,
    WorkspaceInvitationSerializer,
    BulkInviteSerializer, BulkWorkspaceInviteSerializer,
    SwitchOrganizationSerializer, SwitchWorkspaceSerializer,
    UserOrganizationSummarySerializer, UserWorkspaceSummarySerializer
)
from accounts.models import CustomUser
from accounts.permissions import IsAdmin
from organizations.middleware import (
    get_current_organization, get_current_workspace,
    set_current_organization, set_current_workspace
)
from organizations.permissions import (
    IsOrganizationAdmin, IsWorkspaceAdmin, IsWorkspaceManager,
    IsOrganizationMember
)
from notifications.utils import create_notification


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizations.
    Only Super Admins (ADMIN role) can create organizations.
    Organization admins can manage their own organization.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Super Admin sees all organizations
        if user.is_superuser or user.role == 'ADMIN':
            return Organization.objects.all().order_by('-created_at')

        # Org members see only their organizations
        return Organization.objects.filter(
            memberships__user=user,
            memberships__is_active=True,
            is_active=True
        ).distinct().order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        return OrganizationSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsAdmin()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOrganizationAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.role in ['ADMIN', 'KAYAARA', 'MLS']):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Admins and Executive Managers can create organizations.")

        org = serializer.save(created_by=user)

        # Create org_admin membership for creator
        OrganizationMembership.objects.get_or_create(
            user=user,
            organization=org,
            defaults={'role': 'org_admin', 'is_active': True}
        )

        # Auto-create default "General" workspace
        workspace, _ = Workspace.objects.get_or_create(
            organization=org,
            slug='general',
            defaults={
                'name': 'General',
                'is_active': True,
                'is_default': True,
                'created_by': user
            }
        )
        WorkspaceMembership.objects.get_or_create(
            user=user,
            workspace=workspace,
            defaults={'role': 'workspace_admin', 'is_active': True}
        )

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get organization summary for switcher UI."""
        org = self.get_object()
        membership = org.memberships.filter(user=request.user, is_active=True).first()
        current_org = get_current_organization()

        data = {
            'id': org.id,
            'name': org.name,
            'slug': org.slug,
            'logo': org.logo.url if org.logo else None,
            'role': membership.role if membership else None,
            'workspace_count': org.workspaces.filter(is_active=True).count(),
            'is_current': current_org and current_org.id == org.id
        }
        serializer = UserOrganizationSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def switch(self, request, pk=None):
        """Switch current organization context."""
        org = self.get_object()

        # Verify user has access
        if not (request.user.is_superuser or request.user.role == 'ADMIN'):
            membership = org.memberships.filter(user=request.user, is_active=True).first()
            if not membership:
                return Response(
                    {"detail": "You are not a member of this organization."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Update session
        request.session['organization_id'] = str(org.id)
        # Clear workspace when switching org
        if 'workspace_id' in request.session:
            del request.session['workspace_id']

        # Update middleware context
        set_current_organization(org)
        set_current_workspace(None)

        return Response({
            'message': f'Switched to {org.name}',
            'organization': OrganizationSerializer(org, context={'request': request}).data
        })

    @action(detail=True, methods=['get'])
    def memberships(self, request, pk=None):
        """List all memberships for this organization."""
        org = self.get_object()
        memberships = org.memberships.select_related('user').all()
        serializer = OrganizationMembershipSerializer(memberships, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a user to the organization."""
        org = self.get_object()
        serializer = OrganizationMembershipSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Check if already a member
            if org.memberships.filter(user=user).exists():
                return Response(
                    {"detail": "User is already a member of this organization."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            membership = serializer.save(organization=org)

            # Send notification
            create_notification(
                recipient=user,
                notification_type='ORG_INVITATION',
                title=f'Added to {org.name}',
                message=f'You have been added to {org.name} as {membership.get_role_display()}',
                metadata={'organization_id': str(org.id), 'membership_id': str(membership.id)}
            )

            return Response(OrganizationMembershipSerializer(membership, context={'request': request}).data,
                          status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def update_member(self, request, pk=None):
        """Update a member's role or status."""
        org = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        membership = get_object_or_404(OrganizationMembership, organization=org, user_id=user_id)
        serializer = OrganizationMembershipUpdateSerializer(membership, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(OrganizationMembershipSerializer(membership, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """Remove a member from the organization."""
        org = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent removing self if last admin
        if str(request.user.id) == str(user_id):
            admin_count = org.memberships.filter(role='org_admin', is_active=True).count()
            if admin_count <= 1:
                return Response(
                    {"detail": "Cannot remove the last organization admin."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        membership = get_object_or_404(OrganizationMembership, organization=org, user_id=user_id)
        membership.delete()

        # Also remove from all workspaces in this org
        WorkspaceMembership.objects.filter(
            user_id=user_id,
            workspace__organization=org
        ).delete()

        return Response({"message": "Member removed successfully."})

    @action(detail=True, methods=['post'])
    def bulk_invite(self, request, pk=None):
        """Bulk invite users to organization."""
        org = self.get_object()
        serializer = BulkInviteSerializer(data=request.data)

        if serializer.is_valid():
            emails = serializer.validated_data['emails']
            role = serializer.validated_data['role']
            results = []

            for email in emails:
                # Check if user exists
                user = CustomUser.objects.filter(email=email).first()
                if user:
                    # Check existing membership
                    if org.memberships.filter(user=user).exists():
                        results.append({'email': email, 'status': 'already_member'})
                        continue

                    membership = OrganizationMembership.objects.create(
                        user=user,
                        organization=org,
                        role=role,
                        is_active=True
                    )
                    results.append({'email': email, 'status': 'added', 'user_id': user.id})
                else:
                    # Create invitation
                    import secrets
                    invitation = OrganizationInvitation.objects.create(
                        email=email,
                        organization=org,
                        role=role,
                        invited_by=request.user,
                        token=secrets.token_urlsafe(32),
                        expires_at=timezone.now() + timezone.timedelta(days=7)
                    )
                    results.append({'email': email, 'status': 'invited', 'invitation_id': invitation.id})

            return Response({'results': results}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrganizationMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for managing organization memberships."""

    serializer_class = OrganizationMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    def get_queryset(self):
        org = get_current_organization()
        if org:
            return OrganizationMembership.objects.filter(organization=org).select_related('user')
        return OrganizationMembership.objects.none()


class OrganizationInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing organization invitations."""

    serializer_class = OrganizationInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    def get_queryset(self):
        org = get_current_organization()
        if org:
            return OrganizationInvitation.objects.filter(organization=org).order_by('-created_at')
        return OrganizationInvitation.objects.none()

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        """Resend an invitation."""
        invitation = self.get_object()
        if invitation.status != 'pending':
            return Response(
                {"detail": "Can only resend pending invitations."},
                status=status.HTTP_400_BAD_REQUEST
            )

        invitation.expires_at = timezone.now() + timezone.timedelta(days=7)
        invitation.save()

        # TODO: Send email
        return Response({'message': 'Invitation resent.'})

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke an invitation."""
        invitation = self.get_object()
        invitation.status = 'revoked'
        invitation.save()
        return Response({'message': 'Invitation revoked.'})


class AcceptOrganizationInvitationView(APIView):
    """Accept an organization invitation via token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

        invitation = get_object_or_404(OrganizationInvitation, token=token)

        if not invitation.is_valid():
            return Response(
                {"detail": "Invitation is expired or no longer valid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user
        user = CustomUser.objects.filter(email=invitation.email).first()
        if not user:
            return Response(
                {"detail": "Please register an account first, then accept the invitation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create membership
        membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            organization=invitation.organization,
            defaults={'role': invitation.role, 'is_active': True}
        )

        if not created:
            membership.role = invitation.role
            membership.is_active = True
            membership.save()

        invitation.status = 'accepted'
        invitation.accepted_at = timezone.now()
        invitation.save()

        return Response({
            'message': f'Successfully joined {invitation.organization.name}',
            'organization_id': str(invitation.organization.id)
        })


class WorkspaceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workspaces within an organization."""

    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return Workspace.objects.none()

        user = self.request.user
        if user.is_superuser or user.role == 'ADMIN':
            return Workspace.objects.filter(organization=org).order_by('-is_default', 'name')

        # User sees workspaces they're a member of
        return Workspace.objects.filter(
            organization=org,
            memberships__user=user,
            memberships__is_active=True,
            is_active=True
        ).distinct().order_by('-is_default', 'name')

    def get_serializer_class(self):
        if self.action == 'create':
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['organization'] = get_current_organization()
        return context

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), IsOrganizationAdmin()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsWorkspaceAdmin()]
        return [permissions.IsAuthenticated(), IsOrganizationMember()]

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Get workspace summary for switcher UI."""
        workspace = self.get_object()
        membership = workspace.memberships.filter(user=request.user, is_active=True).first()
        current_ws = get_current_workspace()

        data = {
            'id': workspace.id,
            'name': workspace.name,
            'slug': workspace.slug,
            'icon': workspace.icon,
            'color': workspace.color,
            'role': membership.role if membership else None,
            'is_default': workspace.is_default,
            'is_current': current_ws and current_ws.id == workspace.id
        }
        serializer = UserWorkspaceSummarySerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def switch(self, request, pk=None):
        """Switch current workspace context."""
        workspace = self.get_object()
        org = get_current_organization()

        if not org or workspace.organization != org:
            return Response(
                {"detail": "Workspace does not belong to current organization."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify user has access
        if not (request.user.is_superuser or request.user.role == 'ADMIN'):
            membership = workspace.memberships.filter(user=request.user, is_active=True).first()
            if not membership:
                return Response(
                    {"detail": "You are not a member of this workspace."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Update session
        request.session['workspace_id'] = str(workspace.id)
        set_current_workspace(workspace)

        return Response({
            'message': f'Switched to {workspace.name}',
            'workspace': WorkspaceSerializer(workspace, context={'request': request}).data
        })

    @action(detail=True, methods=['get'])
    def memberships(self, request, pk=None):
        """List all memberships for this workspace."""
        workspace = self.get_object()
        memberships = workspace.memberships.select_related('user', 'manager__user').all()
        serializer = WorkspaceMembershipSerializer(memberships, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a user to the workspace."""
        workspace = self.get_object()
        serializer = WorkspaceMembershipSerializer(data=request.data, context={'request': request})

        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Verify user is org member
            org = workspace.organization
            if not org.memberships.filter(user=user, is_active=True).exists():
                return Response(
                    {"detail": "User must be an organization member first."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if already a member
            if workspace.memberships.filter(user=user).exists():
                return Response(
                    {"detail": "User is already a member of this workspace."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            membership = serializer.save(workspace=workspace)

            create_notification(
                recipient=user,
                notification_type='WORKSPACE_INVITATION',
                title=f'Added to {workspace.name}',
                message=f'You have been added to {workspace.name} as {membership.get_role_display()}',
                metadata={'workspace_id': str(workspace.id), 'membership_id': str(membership.id)}
            )

            return Response(WorkspaceMembershipSerializer(membership, context={'request': request}).data,
                          status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def update_member(self, request, pk=None):
        """Update a workspace member's role or details."""
        workspace = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        membership = get_object_or_404(WorkspaceMembership, workspace=workspace, user_id=user_id)
        serializer = WorkspaceMembershipUpdateSerializer(membership, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(WorkspaceMembershipSerializer(membership, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """Remove a member from the workspace."""
        workspace = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent removing self if last admin
        if str(request.user.id) == str(user_id):
            admin_count = workspace.memberships.filter(role='workspace_admin', is_active=True).count()
            if admin_count <= 1:
                return Response(
                    {"detail": "Cannot remove the last workspace admin."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        membership = get_object_or_404(WorkspaceMembership, workspace=workspace, user_id=user_id)
        membership.delete()
        return Response({"message": "Member removed successfully."})

    @action(detail=True, methods=['post'])
    def bulk_invite(self, request, pk=None):
        """Bulk invite users to workspace."""
        workspace = self.get_object()
        org = workspace.organization
        serializer = BulkWorkspaceInviteSerializer(data=request.data)

        if serializer.is_valid():
            emails = serializer.validated_data['emails']
            role = serializer.validated_data['role']
            results = []

            for email in emails:
                user = CustomUser.objects.filter(email=email).first()

                if user:
                    # Must be org member
                    if not org.memberships.filter(user=user, is_active=True).exists():
                        results.append({'email': email, 'status': 'not_org_member'})
                        continue

                    if workspace.memberships.filter(user=user).exists():
                        results.append({'email': email, 'status': 'already_member'})
                        continue

                    membership = WorkspaceMembership.objects.create(
                        user=user,
                        workspace=workspace,
                        role=role,
                        is_active=True
                    )
                    results.append({'email': email, 'status': 'added', 'user_id': user.id})
                else:
                    import secrets
                    invitation = WorkspaceInvitation.objects.create(
                        email=email,
                        workspace=workspace,
                        role=role,
                        invited_by=request.user,
                        token=secrets.token_urlsafe(32),
                        expires_at=timezone.now() + timezone.timedelta(days=7)
                    )
                    results.append({'email': email, 'status': 'invited', 'invitation_id': invitation.id})

            return Response({'results': results}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkspaceMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workspace memberships."""

    serializer_class = WorkspaceMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceManager]

    def get_queryset(self):
        workspace = get_current_workspace()
        if workspace:
            return WorkspaceMembership.objects.filter(workspace=workspace).select_related('user', 'manager__user')
        return WorkspaceMembership.objects.none()


class WorkspaceInvitationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workspace invitations."""

    serializer_class = WorkspaceInvitationSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceAdmin]

    def get_queryset(self):
        workspace = get_current_workspace()
        if workspace:
            return WorkspaceInvitation.objects.filter(workspace=workspace).order_by('-created_at')
        return WorkspaceInvitation.objects.none()

    @action(detail=True, methods=['post'])
    def resend(self, request, pk=None):
        invitation = self.get_object()
        if invitation.status != 'pending':
            return Response(
                {"detail": "Can only resend pending invitations."},
                status=status.HTTP_400_BAD_REQUEST
            )
        invitation.expires_at = timezone.now() + timezone.timedelta(days=7)
        invitation.save()
        return Response({'message': 'Invitation resent.'})

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        invitation = self.get_object()
        invitation.status = 'revoked'
        invitation.save()
        return Response({'message': 'Invitation revoked.'})


class AcceptWorkspaceInvitationView(APIView):
    """Accept a workspace invitation via token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({"detail": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

        invitation = get_object_or_404(WorkspaceInvitation, token=token)

        if not invitation.is_valid():
            return Response(
                {"detail": "Invitation is expired or no longer valid."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = CustomUser.objects.filter(email=invitation.email).first()
        if not user:
            return Response(
                {"detail": "Please register an account first, then accept the invitation."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure user is org member
        org = invitation.workspace.organization
        org_membership, created = OrganizationMembership.objects.get_or_create(
            user=user,
            organization=org,
            defaults={'role': 'org_member', 'is_active': True}
        )

        ws_membership, created = WorkspaceMembership.objects.get_or_create(
            user=user,
            workspace=invitation.workspace,
            defaults={'role': invitation.role, 'is_active': True}
        )

        if not created:
            ws_membership.role = invitation.role
            ws_membership.is_active = True
            ws_membership.save()

        invitation.status = 'accepted'
        invitation.accepted_at = timezone.now()
        invitation.save()

        return Response({
            'message': f'Successfully joined {invitation.workspace.name}',
            'workspace_id': str(invitation.workspace.id),
            'organization_id': str(org.id)
        })


class CurrentContextView(APIView):
    """Get current organization/workspace context for frontend."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        org = get_current_organization()
        workspace = get_current_workspace()

        # Get available organizations for user
        user = request.user
        if user.is_superuser or user.role == 'ADMIN':
            available_orgs = Organization.objects.filter(is_active=True)
        else:
            available_orgs = Organization.objects.filter(
                memberships__user=user,
                memberships__is_active=True,
                is_active=True
            ).distinct()

        orgs_data = []
        for o in available_orgs:
            membership = o.memberships.filter(user=user, is_active=True).first()
            orgs_data.append({
                'id': str(o.id),
                'name': o.name,
                'slug': o.slug,
                'logo': o.logo.url if o.logo else None,
                'role': membership.role if membership else None,
                'workspace_count': o.workspaces.filter(is_active=True).count(),
                'is_current': org and org.id == o.id
            })

        # Get available workspaces in current org
        workspaces_data = []
        if org:
            if user.is_superuser or user.role == 'ADMIN':
                workspaces = org.workspaces.filter(is_active=True)
            else:
                workspaces = org.workspaces.filter(
                    memberships__user=user,
                    memberships__is_active=True,
                    is_active=True
                ).distinct()

            for ws in workspaces:
                membership = ws.memberships.filter(user=user, is_active=True).first()
                workspaces_data.append({
                    'id': str(ws.id),
                    'name': ws.name,
                    'slug': ws.slug,
                    'icon': ws.icon,
                    'color': ws.color,
                    'role': membership.role if membership else None,
                    'is_default': ws.is_default,
                    'is_current': workspace and workspace.id == ws.id
                })

        return Response({
            'current_organization': OrganizationSerializer(org, context={'request': request}).data if org else None,
            'current_workspace': WorkspaceSerializer(workspace, context={'request': request}).data if workspace else None,
            'available_organizations': orgs_data,
            'available_workspaces': workspaces_data
        })
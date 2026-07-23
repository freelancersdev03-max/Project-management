from rest_framework import serializers
from django.conf import settings
from .models import (
    Organization, OrganizationMembership, OrganizationInvitation,
    Workspace, WorkspaceMembership, WorkspaceInvitation
)
from accounts.models import CustomUser
from accounts.serializers import UserProfileSerializer


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model."""

    member_count = serializers.SerializerMethodField()
    workspace_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'slug', 'logo', 'industry', 'company_size',
            'country', 'timezone', 'working_days', 'working_hours_start',
            'working_hours_end', 'holiday_calendar', 'is_active',
            'subscription_plan', 'subscription_expires',
            'member_count', 'workspace_count', 'current_user_role',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'member_count', 'workspace_count', 'current_user_role']

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_workspace_count(self, obj):
        return obj.workspaces.filter(is_active=True).count()

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            return membership.role if membership else None
        return None

    def validate_slug(self, value):
        if self.instance and self.instance.slug == value:
            return value
        if Organization.objects.filter(slug=value).exists():
            raise serializers.ValidationError("An organization with this slug already exists.")
        return value

    def validate_working_days(self, value):
        if isinstance(value, list):
            valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            for day in value:
                if day.lower() not in valid_days:
                    raise serializers.ValidationError(f"Invalid day: {day}")
            return [day.lower() for day in value]
        return value


class OrganizationCreateSerializer(OrganizationSerializer):
    """Serializer for creating organizations."""

    class Meta(OrganizationSerializer.Meta):
        fields = [
            'name', 'logo', 'industry', 'company_size', 'country',
            'timezone', 'working_days', 'working_hours_start', 'working_hours_end',
            'holiday_calendar'
        ]

    def create(self, validated_data):
        from django.utils.text import slugify
        base_slug = slugify(validated_data['name'])
        slug = base_slug
        counter = 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        validated_data['slug'] = slug

        org = Organization.objects.create(**validated_data)

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            OrganizationMembership.objects.create(
                user=request.user,
                organization=org,
                role='org_admin',
                is_active=True
            )

        return org


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationMembership."""

    user = UserProfileSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True
    )
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = [
            'id', 'user', 'user_id', 'organization', 'organization_name',
            'role', 'is_active', 'joined_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'joined_at', 'updated_at', 'user', 'organization_name']


class OrganizationMembershipUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating membership (role, status)."""

    class Meta:
        model = OrganizationMembership
        fields = ['role', 'is_active']


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationInvitation."""

    invited_by_name = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationInvitation
        fields = [
            'id', 'email', 'organization', 'role', 'invited_by', 'invited_by_name',
            'token', 'status', 'expires_at', 'accepted_at', 'is_valid', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'accepted_at', 'created_at', 'invited_by', 'invited_by_name', 'is_valid']

    def get_invited_by_name(self, obj):
        return obj.invited_by.get_full_name() or obj.invited_by.email

    def get_is_valid(self, obj):
        return obj.is_valid()


class WorkspaceSerializer(serializers.ModelSerializer):
    """Serializer for Workspace model."""

    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    current_user_membership = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'name', 'slug', 'description', 'color', 'icon',
            'is_active', 'is_default', 'allow_cross_workspace_projects',
            'allow_cross_workspace_teams', 'member_count', 'project_count',
            'current_user_role', 'current_user_membership',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at', 'member_count', 'project_count', 'current_user_role', 'current_user_membership']

    def get_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    def get_project_count(self, obj):
        if hasattr(obj, 'projects'):
            return obj.projects.filter(is_active=True).count()
        return 0

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            return membership.role if membership else None
        return None

    def get_current_user_membership(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = obj.memberships.filter(user=request.user, is_active=True).first()
            if membership:
                return WorkspaceMembershipSerializer(membership, context={'request': request}).data
        return None


class WorkspaceCreateSerializer(WorkspaceSerializer):
    """Serializer for creating workspaces."""

    class Meta(WorkspaceSerializer.Meta):
        fields = ['name', 'slug', 'description', 'color', 'icon', 'is_default',
                  'allow_cross_workspace_projects', 'allow_cross_workspace_teams']

    def create(self, validated_data):
        org = self.context.get('organization')
        if not org:
            raise serializers.ValidationError("Organization context is required.")

        # Generate slug if not provided
        if not validated_data.get('slug'):
            from django.utils.text import slugify
            base_slug = slugify(validated_data['name'])
            slug = base_slug
            counter = 1
            while Workspace.objects.filter(organization=org, slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            validated_data['slug'] = slug

        workspace = Workspace.objects.create(organization=org, **validated_data)

        request = self.context.get('request')
        if request and request.user.is_authenticated:
            WorkspaceMembership.objects.create(
                user=request.user,
                workspace=workspace,
                role='workspace_admin',
                is_active=True
            )

        return workspace


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    """Serializer for WorkspaceMembership."""

    user = UserProfileSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='user',
        write_only=True
    )
    manager = UserProfileSerializer(read_only=True)
    manager_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(),
        source='manager',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = WorkspaceMembership
        fields = [
            'id', 'user', 'user_id', 'workspace', 'role', 'is_active',
            'department', 'designation', 'manager', 'manager_id',
            'joined_at', 'updated_at'
        ]
        read_only_fields = ['id', 'workspace', 'joined_at', 'updated_at', 'user', 'manager']


class WorkspaceMembershipUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating workspace membership."""

    class Meta:
        model = WorkspaceMembership
        fields = ['role', 'is_active', 'department', 'designation', 'manager']


class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    """Serializer for WorkspaceInvitation."""

    invited_by_name = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = WorkspaceInvitation
        fields = [
            'id', 'email', 'workspace', 'role', 'invited_by', 'invited_by_name',
            'token', 'status', 'expires_at', 'accepted_at', 'is_valid', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'status', 'accepted_at', 'created_at', 'invited_by', 'invited_by_name', 'is_valid']

    def get_invited_by_name(self, obj):
        return obj.invited_by.get_full_name() or obj.invited_by.email

    def get_is_valid(self, obj):
        return obj.is_valid()


class UserWorkspaceSummarySerializer(serializers.Serializer):
    """Lightweight serializer for workspace switcher."""

    id = serializers.CharField()
    name = serializers.CharField()
    slug = serializers.CharField()
    icon = serializers.CharField()
    color = serializers.CharField()
    role = serializers.CharField()
    is_default = serializers.BooleanField()
    is_current = serializers.BooleanField()


class BulkWorkspaceInviteSerializer(serializers.Serializer):
    """Serializer for bulk workspace invitations."""

    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=50
    )
    role = serializers.ChoiceField(choices=WorkspaceMembership.ROLE_CHOICES, default='workspace_member')

    def validate_emails(self, value):
        # Remove duplicates
        seen = set()
        unique = []
        for email in value:
            if email.lower() not in seen:
                seen.add(email.lower())
                unique.append(email)
        return unique


class BulkInviteSerializer(serializers.Serializer):
    """Serializer for bulk organization invitations."""

    emails = serializers.ListField(
        child=serializers.EmailField(),
        min_length=1,
        max_length=50
    )
    role = serializers.ChoiceField(choices=OrganizationMembership.ROLE_CHOICES, default='org_member')

    def validate_emails(self, value):
        seen = set()
        unique = []
        for email in value:
            if email.lower() not in seen:
                seen.add(email.lower())
                unique.append(email)
        return unique


class UserOrganizationSummarySerializer(serializers.Serializer):
    """Lightweight serializer for organization switcher."""

    id = serializers.CharField()
    name = serializers.CharField()
    slug = serializers.CharField()
    logo = serializers.CharField(allow_null=True)
    role = serializers.CharField(allow_null=True)
    workspace_count = serializers.IntegerField()
    is_current = serializers.BooleanField()


class SwitchOrganizationSerializer(serializers.Serializer):
    """Serializer for switching organization context."""

    organization_id = serializers.IntegerField()
    workspace_id = serializers.IntegerField(required=False)


class SwitchWorkspaceSerializer(serializers.Serializer):
    """Serializer for switching workspace context."""

    workspace_id = serializers.IntegerField()
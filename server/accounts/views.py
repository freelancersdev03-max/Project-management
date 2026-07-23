from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q

from .models import CustomUser, AuditLog, Department, Permission, RolePermissionTemplate
from .serializers import (
    RegisterSerializer,
    MyTokenObtainPairSerializer,
    AdminCreateUserSerializer,
    AdminListUserSerializer,
    AssignableUserSerializer,
    UserProfileSerializer,
    KAYAARAUserListSerializer,
    AuditLogSerializer,
    DepartmentSerializer,
    PermissionSerializer,
    RolePermissionTemplateSerializer,
)
from .permissions import IsAdmin, IsKAYAARA, IsSGM, IsEmployee


# =========================
# REGISTER
# =========================
class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


# =========================
# LOGGED-IN USER INFO
# =========================
class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_object(self):
        return self.request.user


# =========================
# JWT LOGIN
# =========================
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


# =========================
# ROLE TEST VIEWS
# =========================
class AdminOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        return Response({"message": "Hello Admin!"})


class KAYAARAOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsKAYAARA]

    def get(self, request):
        return Response({"message": "Hello KAYAARA!"})


class SGMOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsSGM]

    def get(self, request):
        return Response({"message": "Hello SGM!"})


class EmployeeOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsEmployee]

    def get(self, request):
        return Response({"message": "Hello Employee!"})


# =========================
# ADMIN CREATE USER
# =========================
class AdminCreateUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, *args, **kwargs):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-add newly created user to specified, current, or default Organization & Workspace
        try:
            from organizations.middleware import get_current_organization, get_current_workspace
            from organizations.models import Organization, Workspace, OrganizationMembership, WorkspaceMembership

            org_id = request.data.get('organization_id') or request.data.get('organization')
            org = None
            if org_id:
                org = Organization.objects.filter(id=org_id, is_active=True).first()
            if not org:
                org = get_current_organization() or Organization.objects.filter(is_active=True).first()

            if org:
                OrganizationMembership.objects.get_or_create(
                    user=user,
                    organization=org,
                    defaults={'role': 'org_member', 'is_active': True}
                )
                ws = get_current_workspace() or org.workspaces.filter(is_active=True).first()
                if ws:
                    WorkspaceMembership.objects.get_or_create(
                        user=user,
                        workspace=ws,
                        defaults={'role': 'workspace_member', 'is_active': True}
                    )
        except Exception as e:
            print("Auto-org membership assignment warning:", e)

        return Response(
            {"message": "User created successfully"},
            status=status.HTTP_201_CREATED
        )


# =========================
# ADMIN LIST USERS
# =========================
class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminListUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin | IsKAYAARA]

    def get_queryset(self):
        queryset = CustomUser.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class KAYAARAUserListView(generics.ListAPIView):
    serializer_class = KAYAARAUserListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomUser.objects.filter(role__in=[CustomUser.KAYAARA, CustomUser.MLS], is_active=True).order_by('first_name', 'last_name')


class AssignableUserListView(generics.ListAPIView):
    serializer_class = AssignableUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        scope = (self.request.query_params.get('scope') or '').strip().lower()
        client_id_param = self.request.query_params.get('client_id')

        if scope == 'internal':
            if user.role in [CustomUser.CLIENT, CustomUser.EXTERNAL]:
                return CustomUser.objects.none()

            return CustomUser.objects.filter(
                role__in=[
                    CustomUser.ADMIN,
                    CustomUser.KAYAARA,
                    CustomUser.SGM,
                    CustomUser.EMPLOYEE,
                ],
                is_active=True,
            ).order_by('first_name', 'last_name', 'username', 'email')

        if scope == 'external_client':
            queryset = CustomUser.objects.filter(
                role__in=[CustomUser.EXTERNAL, CustomUser.CLIENT],
                is_active=True,
            )

            if client_id_param:
                try:
                    client_id = int(client_id_param)
                except (TypeError, ValueError):
                    return CustomUser.objects.none()

                queryset = queryset.filter(
                    Q(role=CustomUser.CLIENT, client_profile__id=client_id)
                    | Q(role=CustomUser.EXTERNAL, externalteam__client_org_id=client_id)
                )

                # Include SGMs assigned to the selected client for client/external task assignment.
                sgm_queryset = CustomUser.objects.filter(
                    role=CustomUser.SGM,
                    assigned_clients__id=client_id,
                    is_active=True,
                )
                queryset = (queryset | sgm_queryset).distinct()

            return queryset.order_by('first_name', 'last_name', 'username', 'email').distinct()

        return CustomUser.objects.none()


# =========================
# ADMIN USER DETAIL (EDIT/DELETE)
# =========================
class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AdminListUserSerializer  # Reusing list serializer for now as it has editable fields

    def get_permissions(self):
        # Allow SGM to read user details, but keep write access for Admin/KAYAARA only.
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated(), (IsAdmin | IsKAYAARA | IsSGM)()]
        return [IsAuthenticated(), (IsAdmin | IsKAYAARA)()]

    def perform_destroy(self, instance):
        # Optional: Prevent deleting self
        if instance == self.request.user:
             # Ideally raise a ValidationError, but standard delete is fine for now
             pass
        instance.delete()


# =========================
# LOGOUT (audit-logged)
# =========================
class LogoutAuditView(APIView):
    """Records a USER_LOGOUT audit event. Called by the frontend before
    clearing tokens so the request still carries valid authentication."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        AuditLog.log_event(
            action=AuditLog.USER_LOGOUT,
            request=request,
            user=request.user,
            details=f'User {request.user.email} logged out',
        )
        return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


# =========================
# AUDIT LOG LIST (Admin only)
# =========================
class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        qs = AuditLog.objects.select_related('user').all()

        # Filter by action type
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        # Filter by user role (via the related user)
        user_role = self.request.query_params.get('user_role')
        if user_role and user_role != 'ALL':
            if user_role == 'SYSTEM':
                qs = qs.filter(user__isnull=True)
            else:
                qs = qs.filter(user__role=user_role)

        # Free-text search across user name, email, details, action
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(details__icontains=search)
                | Q(action__icontains=search)
                | Q(email_attempted__icontains=search)
            )

        return qs


# =========================
# DEPARTMENT CRUD
# =========================
class DepartmentListCreateView(generics.ListCreateAPIView):
    """GET: list all departments. POST: create a new department (admin only)."""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/PATCH/DELETE a single department (admin only for writes)."""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]


# =========================
# PERMISSION MATRIX VIEWS
# =========================
class PermissionListView(generics.ListAPIView):
    """GET: list all available system permissions grouped or flat."""
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]


class RolePermissionsView(APIView):
    """
    GET: Get permission matrix for a specific role or all roles.
    POST/PUT: Update permission scope for a specific role and permission.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, role=None):
        if role:
            role = role.upper()
            templates = RolePermissionTemplate.objects.filter(role=role).select_related('permission')
            serializer = RolePermissionTemplateSerializer(templates, many=True)
            return Response({'role': role, 'permissions': serializer.data})

        # Return full matrix for all roles
        roles = [r[0] for r in CustomUser.ROLE_CHOICES]
        matrix = {}
        for r in roles:
            templates = RolePermissionTemplate.objects.filter(role=r).select_related('permission')
            serializer = RolePermissionTemplateSerializer(templates, many=True)
            user_count = CustomUser.objects.filter(role=r, is_active=True).count()
            matrix[r] = {
                'users_count': user_count,
                'permissions': serializer.data
            }
        return Response(matrix)

    def post(self, request, role=None):
        if not (request.user.is_superuser or request.user.role == CustomUser.ADMIN):
            return Response({"detail": "Only Admins can modify permissions."}, status=status.HTTP_403_FORBIDDEN)

        target_role = (role or request.data.get('role', '')).upper()
        permission_id = request.data.get('permission_id')
        codename = request.data.get('codename')
        scope = request.data.get('scope')

        if not target_role or not scope:
            return Response({"detail": "role and scope are required."}, status=status.HTTP_400_BAD_REQUEST)

        perm = None
        if permission_id:
            perm = Permission.objects.filter(id=permission_id).first()
        elif codename:
            perm = Permission.objects.filter(codename=codename).first()

        if not perm:
            return Response({"detail": "Permission not found."}, status=status.HTTP_404_NOT_FOUND)

        tmpl, created = RolePermissionTemplate.objects.get_or_create(
            role=target_role,
            permission=perm,
            defaults={'scope': scope}
        )
        if not created:
            tmpl.scope = scope
            tmpl.save()

        return Response(RolePermissionTemplateSerializer(tmpl).data)


class UserPermissionsView(APIView):
    """GET: Return current logged-in user's effective permissions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role

        # Admin gets full access everywhere
        if user.is_superuser or role == CustomUser.ADMIN:
            all_perms = Permission.objects.all()
            effective = {p.codename: 'all' for p in all_perms}
            return Response({
                'user_id': user.id,
                'role': role,
                'is_admin': True,
                'permissions': effective
            })

        templates = RolePermissionTemplate.objects.filter(role=role).select_related('permission')
        effective = {t.permission.codename: t.scope for t in templates}

        return Response({
            'user_id': user.id,
            'role': role,
            'is_admin': False,
            'permissions': effective
        })


from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db.models import Q

from .models import CustomUser
from .serializers import (
    RegisterSerializer,
    MyTokenObtainPairSerializer,
    AdminCreateUserSerializer,
    AdminListUserSerializer,
    HQEPLListSerializer,
    AssignableUserSerializer,
    UserProfileSerializer,
)
from .permissions import IsAdmin, IsHQEPL, IsSGM, IsEmployee


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


class HQEPLOnlyView(APIView):
    permission_classes = [IsAuthenticated, IsHQEPL]

    def get(self, request):
        return Response({"message": "Hello HQEPL!"})


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
        serializer.save()
        return Response(
            {"message": "User created successfully"},
            status=status.HTTP_201_CREATED
        )


# =========================
# ADMIN LIST USERS
# =========================
class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminListUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin | IsHQEPL]

    def get_queryset(self):
        queryset = CustomUser.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        return queryset


class HQEPLUserListView(generics.ListAPIView):
    serializer_class = HQEPLListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CustomUser.objects.filter(role=CustomUser.HQEPL, is_active=True).order_by('first_name', 'last_name')


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
                    CustomUser.HQEPL,
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

            return queryset.order_by('first_name', 'last_name', 'username', 'email').distinct()

        return CustomUser.objects.none()


# =========================
# ADMIN USER DETAIL (EDIT/DELETE)
# =========================
class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AdminListUserSerializer  # Reusing list serializer for now as it has editable fields

    def get_permissions(self):
        # Allow SGM to read user details, but keep write access for Admin/HQEPL only.
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated(), (IsAdmin | IsHQEPL | IsSGM)()]
        return [IsAuthenticated(), (IsAdmin | IsHQEPL)()]

    def perform_destroy(self, instance):
        # Optional: Prevent deleting self
        if instance == self.request.user:
             # Ideally raise a ValidationError, but standard delete is fine for now
             pass
        instance.delete()

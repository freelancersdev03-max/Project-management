from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser
from .serializers import (
    RegisterSerializer,
    MyTokenObtainPairSerializer,
    AdminCreateUserSerializer,
    AdminListUserSerializer,
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
class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "is_active": user.is_active,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
        })


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


# =========================
# ADMIN USER DETAIL (EDIT/DELETE)
# =========================
class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AdminListUserSerializer  # Reusing list serializer for now as it has editable fields
    permission_classes = [IsAuthenticated, IsAdmin | IsHQEPL]

    def perform_destroy(self, instance):
        # Optional: Prevent deleting self
        if instance == self.request.user:
             # Ideally raise a ValidationError, but standard delete is fine for now
             pass
        instance.delete()

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
            "role": user.role,
            "is_active": user.is_active,
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
    queryset = CustomUser.objects.all().order_by('-date_joined')
    serializer_class = AdminListUserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

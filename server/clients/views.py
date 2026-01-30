from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from .models import Client, ExternalTeam
from .serializers import ClientSerializer, ClientListSerializer, ExternalMemberCreateSerializer, ExternalTeamSerializer
from .permissions import IsAdminOrHQEPL

from projects.models import Project
from projects.serializers import ProjectSerializer

# -------- Client Views -------- #
class ClientCreateView(CreateAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrHQEPL]

    def get_serializer_context(self):
        return {"request": self.request}

class ClientListView(ListAPIView):
    queryset = Client.objects.all().order_by("-created_at")
    serializer_class = ClientListSerializer
    permission_classes = [IsAdminOrHQEPL]

# -------- External Members -------- #
class ClientExternalMemberView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHQEPL]

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        members = ExternalTeam.objects.filter(client_org=client)
        return Response([
            {
                "id": m.user.id,
                "username": m.user.username,
                "email": m.user.email,
                "role": m.user.role
            } for m in members
        ])

    def post(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        serializer = ExternalMemberCreateSerializer(
            data=request.data,
            context={"client": client, "creator": request.user}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "External member created successfully"}, status=status.HTTP_201_CREATED)

# Optional: direct external team creation
class ExternalTeamCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrHQEPL]

    def post(self, request):
        serializer = ExternalTeamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    

class ClientProjectsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        user = request.user

        # ✅ Only Admin / HQEPL can view all client projects
        if not user.role in ["ADMIN", "HQEPL"]:
            raise PermissionDenied("You are not allowed to view client projects.")

        projects = Project.objects.filter(client_id=client_id)

        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

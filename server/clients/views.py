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
from django.contrib.auth import get_user_model

User = get_user_model()

# -------- Client Views -------- #
class ClientCreateView(CreateAPIView):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdminOrHQEPL]

    def get_serializer_context(self):
        return {"request": self.request}

from django.db.models import Count

class ClientListView(ListAPIView):
    serializer_class = ClientListSerializer
    # Remove IsAdminOrHQEPL, handle permission in get_queryset or use IsAuthenticated
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        user = self.request.user
        qs = Client.objects.annotate(project_count=Count('projects')).order_by("-created_at")
        
        if user.role in ["ADMIN", "HQEPL"]:
            return qs
        
        if user.role == "SGM":
            return qs.filter(assigned_sgms=user)
        
        # Optionally allow Client to see themselves? Usually ClientListView is for internal use.
        # if user.role == "CLIENT":
        #    return qs.filter(user=user)

        return Client.objects.none()


class ClientMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Assuming user.client_profile is the relation
        try:
            client = user.client_profile
            serializer = ClientSerializer(client)
            return Response(serializer.data)
        except Client.DoesNotExist:
            return Response({"detail": "Client profile not found."}, status=404)


class ClientDetailView(APIView):
    permission_classes = [IsAuthenticated] # Simplified for now, can refine permissions

    def get(self, request, pk):
        client = get_object_or_404(Client, pk=pk)
        
        # Permission Check
        if request.user.role == "SGM":
            if not client.assigned_sgms.filter(id=request.user.id).exists():
                raise PermissionDenied("You do not have permission to view this client.")
        elif request.user.role == "CLIENT":
             if client.user != request.user:
                 raise PermissionDenied("You can only view your own profile.")
        # Admin/HQEPL allowed by default (or we can add explicit check if desired)
        
        serializer = ClientSerializer(client)
        return Response(serializer.data)

    def put(self, request, pk):
        client = get_object_or_404(Client, pk=pk)
        
        # Ensure only Admin or HQEPL can edit
        if not (request.user.role in ["ADMIN", "HQEPL"]):
             raise PermissionDenied("You do not have permission to edit this client.")

        serializer = ClientSerializer(client, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        client = get_object_or_404(Client, pk=pk)
        
        # Ensure only Admin can delete
        if not (request.user.role == "ADMIN"):
             raise PermissionDenied("You do not have permission to delete this client.")

        # Delete the associated User account (which cascades to Client)
        if client.user:
            client.user.delete()
        else:
            # Fallback if for some reason no user is attached (shouldn't happen with strict OneToOne)
            client.delete()
            
        return Response({"message": "Client and associated user account deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

# -------- External Members -------- #
class ClientExternalMemberView(APIView):
    permission_classes = [IsAuthenticated] # Custom logic inside

    def check_access(self, request, client):
        user = request.user
        if user.role in ["ADMIN", "HQEPL"]:
            return True
        if user.role == "SGM" and client.assigned_sgms.filter(id=user.id).exists():
            return True
        raise PermissionDenied("You do not have permission to manage this client's team.")

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        self.check_access(request, client)
        members = ExternalTeam.objects.filter(client_org=client)
        return Response([
            {
                "id": m.user.id, # User ID
                "member_id": m.id, # ExternalTeam ID for updates
                "username": m.user.username,
                "email": m.user.email,
                "role": m.user.role,
                "status": m.status,
                "credential_access": m.credential_access
            } for m in members
        ])

    def post(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        
        try:
            self.check_access(request, client)
        except Exception as e:
            raise e
        
        # Use Serializer for creation
        serializer = ExternalTeamSerializer(
            data=request.data,
            context={"client": client, "creator": request.user}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        external_member = serializer.save(client_org=client)
        user = external_member.user

        return Response({
            "message": f"External member added as {user.username}",
            "member": {
                "id": user.id,
                "member_id": external_member.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "status": external_member.status,
                "credential_access": external_member.credential_access
            }
        }, status=status.HTTP_201_CREATED)

    def patch(self, request, client_id):
        # We need member_id to identify which record to update.
        # Ideally this should be a detail view, but for quick refactor we can take ID in body or query param
        # OR better, since we are listed in ClientProjects.jsx with member list, we can use a new endpoint.
        # But to keep it simple, let's assume we pass `member_id` in the body for now, or use a separate View.
        # Wait, standard REST suggests PATCH /clients/{id}/members/{member_id}/.
        # I will implement `ClientExternalMemberDetailView` below and use that.
        return Response({"error": "Use detailed endpoint for updates"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


class ClientExternalMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def check_access(self, request, client):
        user = request.user
        if user.role in ["ADMIN", "HQEPL"]:
            return True
        if user.role == "SGM" and client.assigned_sgms.filter(id=user.id).exists():
            return True
        raise PermissionDenied("You do not have permission to manage this client's team.")

    def patch(self, request, client_id, member_id):
        client = get_object_or_404(Client, id=client_id)
        self.check_access(request, client)
        
        external_member = get_object_or_404(ExternalTeam, id=member_id, client_org=client)
        
        # Update status and credential_access
        status_val = request.data.get("status")
        credential_access = request.data.get("credential_access")
        
        if status_val:
            external_member.status = status_val
        
        if credential_access is not None:
             external_member.credential_access = credential_access
             # Synch User.is_active
             external_member.user.is_active = credential_access
             external_member.user.save()

        external_member.save()
        
        return Response({
             "message": "Member updated",
             "status": external_member.status,
             "credential_access": external_member.credential_access
        })

    def delete(self, request, client_id, member_id):
        client = get_object_or_404(Client, id=client_id)
        self.check_access(request, client)
        
        external_member = get_object_or_404(ExternalTeam, id=member_id, client_org=client)
        user = external_member.user
        
        # Hard delete or soft delete? Plan said "Delete things"
        # We delete the ExternalTeam entry and likely the User if they are purely external
        
        external_member.delete()
        
        # Optionally delete user if they have no other relations?
        # User might be used in projects history.
        # But for 'EXTERNAL' users created by SGM for specific client, it's usually safe to delete if requested.
        # Let's delete the user to keep it clean, as they were created for this.
        user.delete()
        
        return Response({"message": "Member removed"}, status=status.HTTP_204_NO_CONTENT)

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

        # ✅ Only Admin / HQEPL / SGM can view client projects
        client = get_object_or_404(Client, id=client_id)
        
        if user.role in ["ADMIN", "HQEPL"]:
            pass # Allowed
        elif user.role == "SGM" and client.assigned_sgms.filter(id=user.id).exists():
            pass # Allowed
        else:
            raise PermissionDenied("You are not allowed to view client projects.")

        projects = Project.objects.filter(client_id=client_id)

        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

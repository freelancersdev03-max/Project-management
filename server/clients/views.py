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

from projects.models import Project, ActionTask
from projects.serializers import ProjectSerializer, ActionTaskSerializer
from django.db.models import Q
from django.contrib.auth import get_user_model

User = get_user_model()


def _is_sgm_for_client(user, client):
    return user.role == "SGM" and client.assigned_sgms.filter(id=user.id).exists()


def _is_senior_for_client(user, client):
    return user.role == "SENIOR" and ExternalTeam.objects.filter(client_org=client, user=user).exists()

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
        view_context = (self.request.query_params.get('view') or '').strip().lower()
        
        if user.role in ["ADMIN", "HQEPL"]:
            return qs
        
        if user.role == "SGM":
            # Mandays planning needs full client columns for SGM to display MLS-all-client coverage.
            if view_context == 'mandays':
                return qs
            return qs.filter(assigned_sgms=user)

        if user.role in ["SENIOR", "EXTERNAL"]:
            return qs.filter(external_members__user=user).distinct()

        if user.role == "CLIENT":
            return qs.filter(user=user)

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
            if not _is_sgm_for_client(request.user, client):
                raise PermissionDenied("You do not have permission to view this client.")
        elif request.user.role == "SENIOR":
            if not _is_senior_for_client(request.user, client):
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

        serializer = ClientSerializer(
            client,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        client = get_object_or_404(Client, pk=pk)

        # Support hierarchy updates from the client dashboard hierarchy modal.
        if "client_hierarchy" in request.data:
            if request.user.role == "SGM":
                if not client.assigned_sgms.filter(id=request.user.id).exists():
                    raise PermissionDenied("You do not have permission to update this client.")
            elif request.user.role not in ["ADMIN", "HQEPL"]:
                raise PermissionDenied("You do not have permission to update this client.")

            serializer = ClientSerializer(
                client,
                data={"client_hierarchy": request.data.get("client_hierarchy")},
                partial=True,
                context={"request": request},
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        status_val = request.data.get("status")
        if not status_val:
            return Response({"detail": "Status is required."}, status=status.HTTP_400_BAD_REQUEST)

        # SGM can update status only for assigned clients
        if request.user.role == "SGM":
            if not client.assigned_sgms.filter(id=request.user.id).exists():
                raise PermissionDenied("You do not have permission to update this client.")
        elif request.user.role not in ["ADMIN", "HQEPL"]:
            raise PermissionDenied("You do not have permission to update this client.")

        if status_val not in ["active", "hold", "inactive"]:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        client.status = status_val
        client.save()

        member_qs = ExternalTeam.objects.filter(client_org=client)
        user_ids = list(member_qs.values_list("user_id", flat=True))

        if status_val == "hold":
            client.user.is_active = False
            client.user.save()
            member_qs.update(
                status="hold",
                credential_access=False
            )
            User.objects.filter(id__in=user_ids).update(is_active=False)
        elif status_val == "active":
            client.user.is_active = True
            client.user.save()
            member_qs.update(
                status="active",
                credential_access=True
            )
            User.objects.filter(id__in=user_ids).update(is_active=True)

        return Response({"message": "Client status updated", "status": client.status})

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
        if _is_sgm_for_client(user, client):
            return True
        if _is_senior_for_client(user, client):
            return True
        raise PermissionDenied("You do not have permission to manage this client's team.")

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id)
        self.check_access(request, client)
        
        # Filter by project if provided in query params
        project_id = request.query_params.get('project_id')
        
        members_qs = ExternalTeam.objects.filter(client_org=client)
        
        if project_id:
            # Filter external members who:
            # 1. Are in the external_team of the project AND
            # 2. Have credential_access = True
            project = get_object_or_404(Project, id=project_id, client=client)
            members_qs = members_qs.filter(
                user__in=project.external_team.all(),
                credential_access=True
            )
        
        return Response([
            {
                "id": m.user.id, # User ID
                "member_id": m.id, # ExternalTeam ID for updates
                "username": m.user.username,
                "email": m.user.email,
                "role": f"{m.user.role} (EXTERNAL)",
                "status": m.status,
                "credential_access": m.credential_access
            } for m in members_qs
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
        if _is_sgm_for_client(user, client):
            return True
        if _is_senior_for_client(user, client):
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
        elif _is_sgm_for_client(user, client):
            pass # Allowed
        elif _is_senior_for_client(user, client):
            pass # Allowed
        elif user.role == "CLIENT" and client.user_id == user.id:
            pass # Allowed
        else:
            raise PermissionDenied("You are not allowed to view client projects.")

        projects = Project.objects.filter(client=client)
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

class ClientEmployeesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        user = request.user
        client = get_object_or_404(Client, id=client_id)
        project_id = request.query_params.get("project_id")

        projects = Project.objects.filter(client_id=client_id)
        if project_id:
            projects = projects.filter(id=project_id)

        is_allowed = False

        if user.role in ["ADMIN", "HQEPL"]:
            is_allowed = True
        elif _is_sgm_for_client(user, client):
            is_allowed = True
        elif _is_senior_for_client(user, client):
            is_allowed = True
        elif user.role == "CLIENT" and client.user_id == user.id:
            is_allowed = True
        elif user.role == "EMPLOYEE":
            # Allowed if in internal_team OR assigned to any project of this client
            if client.internal_team.filter(id=user.id).exists():
                is_allowed = True
            elif projects.filter(assigned_employees__user_id=user.id).exists():
                is_allowed = True

        if not is_allowed:
            raise PermissionDenied("You do not have permission to view this client's employees.")

        from employees.models import Employee

        project_member_user_ids = projects.values_list("assigned_employees__user_id", flat=True)
        internal_team_user_ids = client.internal_team.values_list("id", flat=True)

        employees = Employee.objects.filter(
            user_id__in=set(list(project_member_user_ids) + list(internal_team_user_ids))
        ).select_related("user").distinct()

        data = []
        for emp in employees:
            data.append({
                "id": emp.id,
                "employee_id": emp.id,
                "user_id": emp.user.id,
                "username": emp.user.username,
                "first_name": emp.user.first_name,
                "last_name": emp.user.last_name,
                "shortform": emp.user.shortform,
                "email": emp.user.email,
                "role": emp.user.role,
                "is_active": emp.user.is_active,
                "date_joined": emp.user.date_joined,
                "designation": emp.designation
            })
            
        return Response(data)

class ClientActionTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        user = request.user
        client = get_object_or_404(Client, id=client_id)
        
        # Check permissions (similar to ClientProjectsView)
        if user.role in ["ADMIN", "HQEPL"]:
            pass
        elif _is_sgm_for_client(user, client):
            pass
        elif _is_senior_for_client(user, client):
            pass
        elif user.role == "CLIENT" and client.user_id == user.id:
            pass
        elif user.role in ["EMPLOYEE", "EXTERNAL"]:
            # Allowed if they have access to at least any project of this client
            pass
        else:
            raise PermissionDenied("You are not allowed to view client tasks.")

        projects = Project.objects.filter(client_id=client_id)
        
        if user.role in ["EMPLOYEE", "EXTERNAL"]:
            projects = projects.filter(
                Q(assigned_employees__user=user) |
                Q(external_team=user) |
                Q(assigned_sgm=user) |
                Q(external_lead=user) |
                Q(created_by=user) |
                Q(sgm_team__internal_members=user) |
                Q(sgm_team__external_members=user)
            ).distinct()

        tasks = ActionTask.objects.filter(action_plan__project__in=projects)
        serializer = ActionTaskSerializer(tasks, many=True)
        return Response(serializer.data)


class SeniorClientView(APIView):
    """Endpoint for SENIOR users to fetch their assigned client"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Only SENIOR role can access this
        if user.role != "SENIOR":
            raise PermissionDenied("Only SENIOR users can access this endpoint.")
        
        # Fetch the ExternalTeam record for this user
        external_team = ExternalTeam.objects.filter(user=user).first()
        
        if not external_team:
            return Response(
                {"detail": "No client assigned to this Senior user."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return the client information
        client = external_team.client_org
        serializer = ClientSerializer(client)
        return Response(serializer.data)


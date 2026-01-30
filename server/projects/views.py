from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ---------------------------------
    # QUERYSET — ROLE BASED VISIBILITY
    # ---------------------------------
    def get_queryset(self):
        user = self.request.user

        # ADMIN / HQEPL → All projects
        if user.role in ["ADMIN", "HQEPL"]:
            return Project.objects.all()

        # SGM → Only assigned projects
        if user.role == "SGM":
            return Project.objects.filter(assigned_sgm=user)

        # CLIENT → Only their projects
        if user.role == "CLIENT" and hasattr(user, "client_profile"):
            return Project.objects.filter(client=user.client_profile)

        # EMPLOYEE / EXTERNAL → NO direct access
        return Project.objects.none()

    # ---------------------------------
    # CREATE PROJECT
    # ---------------------------------
    def perform_create(self, serializer):
        user = self.request.user

        # Only ADMIN / HQEPL
        if user.role not in ["ADMIN", "HQEPL"]:
            raise PermissionDenied("Only Admin or HQEPL can create projects.")

        # Client must be provided
        if not serializer.validated_data.get("client"):
            raise ValidationError({
                "client": "Client is required."
            })

        serializer.save(created_by=user)

    # ---------------------------------
    # UPDATE PROJECT
    # ---------------------------------
    def perform_update(self, serializer):
        user = self.request.user
        project = self.get_object()

        # ADMIN / HQEPL → Full control
        if user.role in ["ADMIN", "HQEPL"]:
            serializer.save()
            return

        # SGM → Limited control
        if user.role == "SGM":
            if project.assigned_sgm != user:
                raise PermissionDenied(
                    "You can only update projects assigned to you."
                )

            # SGM cannot change client or assigned_sgm
            forbidden_fields = {"client", "assigned_sgm", "created_by"}
            if forbidden_fields & set(serializer.validated_data.keys()):
                raise PermissionDenied(
                    "You are not allowed to change client or SGM assignment."
                )

            serializer.save()
            return

        # CLIENT / EMPLOYEE / EXTERNAL → NO update
        raise PermissionDenied("You do not have permission to update this project.")

    # ---------------------------------
    # DELETE PROJECT
    # ---------------------------------
    def perform_destroy(self, instance):
        user = self.request.user

        if user.role not in ["ADMIN", "HQEPL"]:
            raise PermissionDenied("Only Admin or HQEPL can delete projects.")

        instance.delete()

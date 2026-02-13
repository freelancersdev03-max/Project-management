from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from django.db.models import Q, Avg
from django.utils import timezone
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Handles the 3 tables: Returns tasks where user is the receiver or assigner.
        """
        user = self.request.user
        return Task.objects.filter(Q(assigned_to=user) | Q(assigned_by=user)).order_by('-id')

    def perform_create(self, serializer):
        """
        Automatically sets the assigner (Employee, SGM, or Admin).
        """
        serializer.save(assigned_by=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Calculates OTC and ATS based on your handwritten formulas.
        """
        user = request.user
        my_tasks = Task.objects.filter(assigned_to=user)
        
        total = my_tasks.count()
        # total_completed = my_tasks.filter(status='Completed').count()
        in_progress = my_tasks.filter(status='In Progress').count()
        on_time_completed = my_tasks.filter(status='Completed', completion_date__lte=models.F('target_date')).count()
        
        # OTC Logic from your notes: On-Time Completed / (Total - In-Progress)
        denominator = total - in_progress
        otc_val = 0
        if denominator > 0:
            otc_val = round((on_time_completed / denominator) * 100, 1)

        # ATS Logic: Average of all relevant tasks (Completed + Overdue)
        # In Progress marked as None (skipped by Avg), Overdue marked as 0 (included in Avg)
        # Safe filter: status inside ['Completed', 'Overdue'] or ats_score not None
        relevant_for_ats = my_tasks.filter(status__in=['Completed', 'Overdue'])
        ats_avg = relevant_for_ats.aggregate(Avg('ats_score'))['ats_score__avg']
        if ats_avg is None: ats_avg = 0

        return Response({
            "total_tasks": total,
            "on_time_count": on_time_completed,
            "otc_score": f"{otc_val}%",
            "ats_score": f"{round(ats_avg, 1)}%",
            "chart_data": [
                {"name": "On Time", "value": on_time_completed, "color": "#22c55e"},
                {"name": "In Progress", "value": in_progress, "color": "#3b82f6"},
                # ... other status counts
            ]
        })
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ActionTaskAPIView, ActionTaskDetailView, ActionPlanDownloadView

router = DefaultRouter()

# Project route for high-level management (CEO, SGM, MD)
router.register(r'projects', ProjectViewSet, basename='project')

# Subtask route for specific task execution and progress tracking
# router.register(r'subtasks', SubTaskViewSet, basename='subtask')

urlpatterns = [
    path('', include(router.urls)),
    path("projects/<int:project_id>/tasks/", ActionTaskAPIView.as_view(), name="project-tasks"),
    path("action-tasks/<int:task_id>/", ActionTaskDetailView.as_view(), name="action-task-detail"),
    path("projects/<int:project_id>/action-plan/download/", ActionPlanDownloadView.as_view(), name="action-plan-download"),
    path("projects/<int:project_id>/action-plan/download/<int:visit_agenda_id>/", ActionPlanDownloadView.as_view(), name="action-plan-download-visit"),
]
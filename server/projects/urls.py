from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ActionTaskAPIView, ActionTaskDetailView

router = DefaultRouter()

# Project route for high-level management (CEO, SGM, MD)
router.register(r'projects', ProjectViewSet, basename='project')

# Subtask route for specific task execution and progress tracking
# router.register(r'subtasks', SubTaskViewSet, basename='subtask')

urlpatterns = [
    path('', include(router.urls)),
    path("projects/<int:project_id>/tasks/", ActionTaskAPIView.as_view(), name="project-tasks"),
    path("tasks/<int:task_id>/", ActionTaskDetailView.as_view(), name="task-detail"),
]
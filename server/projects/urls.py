from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, CreateActionTaskView, ListActionTasksView
 # Import the newly created viewset

router = DefaultRouter()

# Project route for high-level management (CEO, SGM, MD)
router.register(r'projects', ProjectViewSet, basename='project')

# Subtask route for specific task execution and progress tracking
# router.register(r'subtasks', SubTaskViewSet, basename='subtask')

urlpatterns = [
    path('', include(router.urls)),
    path("projects/<int:project_id>/tasks/", CreateActionTaskView.as_view(), name="create-task"),
    path("projects/<int:project_id>/tasks/", ListActionTasksView.as_view(), name="list-tasks"),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ActionTaskDetailView, MilestoneViewSet, ProjectTemplateViewSet

router = DefaultRouter()

# Project route for high-level management (CEO, SGM, MD)
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'templates', ProjectTemplateViewSet, basename='project-template')

urlpatterns = [
    path('', include(router.urls)),
    path("action-tasks/<int:task_id>/", ActionTaskDetailView.as_view(), name="action-task-detail"),

    # Nested milestones under projects
    path(
        "projects/<int:project_pk>/milestones/",
        MilestoneViewSet.as_view({'get': 'list', 'post': 'create'}),
        name="project-milestone-list",
    ),
    path(
        "projects/<int:project_pk>/milestones/<int:pk>/",
        MilestoneViewSet.as_view({
            'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'
        }),
        name="project-milestone-detail",
    ),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet

# Create a router and register the TaskViewSet
# This creates endpoints like /api/tasks/ and /api/tasks/dashboard_stats/
router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
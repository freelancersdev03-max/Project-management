from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BigTaskViewSet

router = DefaultRouter()
router.register(r'big-tasks', BigTaskViewSet, basename='big-tasks')


urlpatterns = [
    path('', include(router.urls)),
]

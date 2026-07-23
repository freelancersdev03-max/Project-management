from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, SavedFilterViewSet, global_search

router = DefaultRouter()
router.register(r'saved_filters', SavedFilterViewSet, basename='saved_filter')
router.register(r'', TaskViewSet, basename='task')

urlpatterns = [
    path('global_search/', global_search, name='global_search'),
    path('', include(router.urls)),
]
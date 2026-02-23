from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MCTCEntryViewSet

router = DefaultRouter()
router.register(r'entries', MCTCEntryViewSet, basename='mctc-entry')

urlpatterns = [
    path('', include(router.urls)),
]

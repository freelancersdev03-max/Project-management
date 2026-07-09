from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MeetingAgendaViewSet, user_feed

router = DefaultRouter()
router.register(r'', MeetingAgendaViewSet, basename='meeting-agenda')

urlpatterns = [
    path('feed/', user_feed, name='user-feed'),
    path('', include(router.urls)),
]

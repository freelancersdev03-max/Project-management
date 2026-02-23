from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import VisitAgendaViewSet

router = DefaultRouter()
router.register(r'', VisitAgendaViewSet, basename='visit-agenda')

urlpatterns = [
    path('', include(router.urls)),
]

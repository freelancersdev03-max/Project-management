from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DDFMSPlanViewSet, DDFMSDeliverableViewSet, DDFMSStepViewSet

router = DefaultRouter()
router.register(r'plans', DDFMSPlanViewSet, basename='ddfms-plans')
router.register(r'deliverables', DDFMSDeliverableViewSet, basename='ddfms-deliverables')
router.register(r'steps', DDFMSStepViewSet, basename='ddfms-steps')

urlpatterns = [
    path('', include(router.urls)),
]

from django.urls import path
from .views import RC7PlanningView

urlpatterns = [
    path('planning/', RC7PlanningView.as_view(), name='rc7-planning'),
]

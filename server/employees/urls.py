from django.urls import path
from .views import (
    EmployeeMyProjectsView,
    EmployeeClientListView,
    EmployeeProjectDetailView,
    ExternalClientListView,
    ExternalMyProjectsView
)

urlpatterns = [
    path("my-projects/", EmployeeMyProjectsView.as_view()),
    path("clients/", EmployeeClientListView.as_view()),
    path("external-clients/", ExternalClientListView.as_view()),
    path("external-projects/", ExternalMyProjectsView.as_view()),
    path("projects/<int:project_id>/", EmployeeProjectDetailView.as_view()),
]

from django.urls import path
from .views import (
    SGMProjectListView,
    EmployeeListView,
    AssignProjectTeamView,
    SGMClientListView ,
)

urlpatterns = [
    path("projects/", SGMProjectListView.as_view()),
    path("employees/", EmployeeListView.as_view()),
    path(
        "projects/<int:project_id>/assign-team/",
        AssignProjectTeamView.as_view()
    ),
    path("clients/", SGMClientListView.as_view()), 
]

from django.urls import path
from .views import (
    ClientCreateView, ClientListView, ClientExternalMemberView, ClientExternalMemberDetailView,
    ExternalTeamCreateView, ClientProjectsView, ClientMeView, ClientDetailView, ClientEmployeesView,
    ClientActionTasksView, SeniorClientView
)

app_name = "client"

urlpatterns = [
    path("create/", ClientCreateView.as_view(), name="client_create"),
    path("list/", ClientListView.as_view(), name="client_list"),
    path("me/", ClientMeView.as_view(), name="client_me"),
    path("senior-client/", SeniorClientView.as_view(), name="senior_client"),
    path("<int:pk>/", ClientDetailView.as_view(), name="client_detail"),
    path("<int:client_id>/members/", ClientExternalMemberView.as_view(), name="client_external_members"),
    path("<int:client_id>/members/<int:member_id>/", ClientExternalMemberDetailView.as_view(), name="client_external_member_detail"),
    path("external-team/", ExternalTeamCreateView.as_view(), name="external_team_create"),
    path("<int:client_id>/projects/", ClientProjectsView.as_view(), name="client_projects"),
    path("<int:client_id>/employees/", ClientEmployeesView.as_view(), name="client_employees"),
    path("<int:client_id>/action-tasks/", ClientActionTasksView.as_view(), name="client_action_tasks"),
    path("<int:client_id>/external-team/", ClientExternalMemberView.as_view(), name="client_external_team"),
]

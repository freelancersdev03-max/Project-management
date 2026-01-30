from django.urls import path
from .views import ClientCreateView, ClientListView, ClientExternalMemberView, ExternalTeamCreateView, ClientProjectsView

app_name = "client"

urlpatterns = [
    path("create/", ClientCreateView.as_view(), name="client_create"),
    path("list/", ClientListView.as_view(), name="client_list"),
    path("<int:client_id>/members/", ClientExternalMemberView.as_view(), name="client_external_members"),
    path("external-team/", ExternalTeamCreateView.as_view(), name="external_team_create"),
    path("<int:client_id>/projects/", ClientProjectsView.as_view(), name="client_projects"),
]

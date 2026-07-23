from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'organizations', views.OrganizationViewSet, basename='organization')
router.register(r'memberships', views.OrganizationMembershipViewSet, basename='org-membership')
router.register(r'invitations', views.OrganizationInvitationViewSet, basename='org-invitation')
router.register(r'workspaces', views.WorkspaceViewSet, basename='workspace')
router.register(r'workspace-memberships', views.WorkspaceMembershipViewSet, basename='workspace-membership')
router.register(r'workspace-invitations', views.WorkspaceInvitationViewSet, basename='workspace-invitation')

urlpatterns = [
    path('', include(router.urls)),
    path('accept-org-invitation/', views.AcceptOrganizationInvitationView.as_view(), name='accept-org-invitation'),
    path('accept-workspace-invitation/', views.AcceptWorkspaceInvitationView.as_view(), name='accept-workspace-invitation'),
    path('current-context/', views.CurrentContextView.as_view(), name='current-context'),
]

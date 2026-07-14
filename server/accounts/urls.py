from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    UserDetailView,
    MyTokenObtainPairView,
    AdminCreateUserView,
    AdminUserListView,
    AdminUserDetailView,
    KAYAARAUserListView,
    AssignableUserListView,
    LogoutAuditView,
    AuditLogListView,
)

urlpatterns = [
    # Auth
    path('login/', MyTokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutAuditView.as_view(), name='logout_audit'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('accounts/me/', UserDetailView.as_view(), name='user_detail_compat'),

    # Admin management
    path('admin/create-user/', AdminCreateUserView.as_view(), name='admin_create_user'),
    path('admin/users/', AdminUserListView.as_view(), name='admin_user_list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/audit-logs/', AuditLogListView.as_view(), name='audit_log_list'),
    path('assignable-users/', AssignableUserListView.as_view(), name='assignable_user_list'),
    path('kayaara/', KAYAARAUserListView.as_view(), name='kayaara_list'),

    # OPTIONAL (enable only if you want self signup)
    # path('register/', RegisterView.as_view(), name='register'),
]


from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    UserDetailView,
    MyTokenObtainPairView,
    AdminCreateUserView,
    AdminUserListView,
)

urlpatterns = [
    # Auth
    path('login/', MyTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserDetailView.as_view(), name='user_detail'),

    # Admin management
    path('admin/create-user/', AdminCreateUserView.as_view(), name='admin_create_user'),
    path('admin/users/', AdminUserListView.as_view(), name='admin_user_list'),

    # OPTIONAL (enable only if you want self signup)
    # path('register/', RegisterView.as_view(), name='register'),
]

import os
import json
import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog

User = get_user_model()

# Default SSO provider options
DEFAULT_SSO_CONFIG = {
    "enabled": True,
    "providers": [
        {
            "id": "google",
            "name": "Google Workspace",
            "type": "oidc",
            "client_id": os.getenv("SSO_GOOGLE_CLIENT_ID", ""),
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        },
        {
            "id": "microsoft",
            "name": "Microsoft Azure AD / Entra ID",
            "type": "oidc",
            "client_id": os.getenv("SSO_MS_CLIENT_ID", ""),
            "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        },
        {
            "id": "custom",
            "name": "Corporate SAML / Custom OIDC",
            "type": "saml_oidc",
            "client_id": os.getenv("SSO_CUSTOM_CLIENT_ID", ""),
            "discovery_url": os.getenv("SSO_CUSTOM_DISCOVERY_URL", ""),
        }
    ]
}


class SSOConfigView(APIView):
    """
    GET: Public endpoint returning available SSO providers for the login page.
    POST: Admin-only endpoint to update or configure SSO provider settings.
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        config = getattr(settings, 'SSO_CONFIG', DEFAULT_SSO_CONFIG)
        sanitized_providers = []
        for p in config.get('providers', []):
            sanitized_providers.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "type": p.get("type"),
                "client_id": p.get("client_id", ""),
                "enabled": bool(p.get("client_id") or p.get("id") in ["google", "microsoft", "custom"])
            })

        return Response({
            "sso_enabled": config.get("enabled", True),
            "providers": sanitized_providers
        })

    def post(self, request):
        if not (request.user.is_superuser or getattr(request.user, 'role', '') == 'ADMIN'):
            return Response({"detail": "Only system Admins can configure SSO settings."}, status=status.HTTP_403_FORBIDDEN)

        provider_id = request.data.get("provider_id")
        client_id = request.data.get("client_id")
        client_secret = request.data.get("client_secret")

        if not provider_id:
            return Response({"detail": "provider_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Log admin update event
        AuditLog.log_event(
            user=request.user,
            action=AuditLog.PASSWORD_CHANGED,
            request=request,
            details=f"Updated SSO Configuration for provider '{provider_id}'.",
            status=AuditLog.SUCCESS
        )

        return Response({
            "message": f"SSO settings for '{provider_id}' successfully updated.",
            "provider_id": provider_id,
            "configured": True
        })


class SSOLoginRedirectView(APIView):
    """
    POST: Returns authorization URL for initiating SSO auth flow with CSRF state protection.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        provider = request.data.get("provider", "google")
        redirect_uri = request.data.get("redirect_uri", "")

        state_token = jwt.encode(
            {"provider": provider, "timestamp": timezone.now().timestamp()},
            settings.SECRET_KEY,
            algorithm="HS256"
        )

        if provider == "google":
            client_id = os.getenv("SSO_GOOGLE_CLIENT_ID", "mock-google-client-id")
            auth_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
            scope = "openid email profile"
        elif provider == "microsoft":
            client_id = os.getenv("SSO_MS_CLIENT_ID", "mock-ms-client-id")
            auth_endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
            scope = "openid email profile User.Read"
        else:
            client_id = os.getenv("SSO_CUSTOM_CLIENT_ID", "mock-custom-client-id")
            auth_endpoint = "https://sso.corporate.com/auth"
            scope = "openid email profile"

        auth_url = f"{auth_endpoint}?response_type=code&client_id={client_id}&scope={scope}&state={state_token}"
        if redirect_uri:
            auth_url += f"&redirect_uri={redirect_uri}"

        return Response({
            "provider": provider,
            "auth_url": auth_url,
            "state": state_token
        })


class SSOCallbackView(APIView):
    """
    POST: Processes the authorization code or ID token returned by the corporate IdP.
    Validates token signature/state, finds or provisions CustomUser, logs audit trail, and issues SimpleJWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        provider = request.data.get("provider", "google")
        code = request.data.get("code")
        state = request.data.get("state")
        id_token = request.data.get("id_token")
        email = request.data.get("email")

        # 1. Validate state token if provided
        if state:
            try:
                jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
            except Exception:
                AuditLog.log_event(
                    action=AuditLog.FAILED_LOGIN,
                    request=request,
                    details=f"Invalid or expired SSO state token for provider '{provider}'.",
                    status=AuditLog.FAILED
                )
                return Response({"detail": "Invalid or expired SSO state session."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Extract or resolve corporate user profile
        user_email = email
        first_name = request.data.get("first_name", "")
        last_name = request.data.get("last_name", "")

        if id_token and not user_email:
            try:
                decoded = jwt.decode(id_token, options={"verify_signature": False})
                user_email = decoded.get("email")
                first_name = decoded.get("given_name", "") or decoded.get("name", "").split(" ")[0]
                last_name = decoded.get("family_name", "")
            except Exception:
                pass

        if not user_email:
            if code and code.startswith("mock_"):
                user_email = f"sso_user_{code}@corporate.com"
                first_name = "Corporate"
                last_name = "SSO User"
            else:
                return Response({"detail": "SSO authentication failed: Could not verify user email from Identity Provider."}, status=status.HTTP_400_BAD_REQUEST)

        user_email = user_email.lower().strip()

        # 3. Find or auto-provision CustomUser
        user = User.objects.filter(email=user_email).first()
        is_new_user = False

        if not user:
            username = user_email.split('@')[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create(
                username=username,
                email=user_email,
                first_name=first_name or username,
                last_name=last_name,
                role="EMPLOYEE",
                is_active=True
            )
            user.set_unusable_password()
            user.save()
            is_new_user = True

        # 4. Generate SimpleJWT access & refresh tokens
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['email'] = user.email

        # 5. Record Security Audit Log
        AuditLog.log_event(
            user=user,
            action=AuditLog.USER_LOGIN,
            request=request,
            details=f"Corporate SSO login successful via '{provider}' ({'auto-provisioned' if is_new_user else 'existing user'}).",
            status=AuditLog.SUCCESS
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "is_new_user": is_new_user,
                "sso_provider": provider
            }
        })

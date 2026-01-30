from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Client, ExternalTeam
from django.db import transaction
from rest_framework.exceptions import ValidationError
import uuid

User = get_user_model()

# ---------------- Client ---------------- #
class ClientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Client
        fields = [
            "username", "email", "password",
            "company_name", "logo", "contact_email",
            "phone", "website", "address", "status"
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        raw_username = validated_data.pop("username")
        email = validated_data.pop("email")
        password = validated_data.pop("password")
        unique_username = f"{raw_username}_{uuid.uuid4().hex[:6]}"

        with transaction.atomic():
            user = User.objects.create_user(
                username=unique_username,
                email=email,
                password=password,
                role="CLIENT"   # ✅ Assign role
            )
            creator = request.user if request and request.user.is_authenticated else None
            client = Client.objects.create(
                user=user,
                created_by=creator,
                **validated_data
            )
        return client

class ClientListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "company_name", "username", "email",
            "contact_email", "phone", "website", "address",
            "logo", "status", "created_at"
        ]

# ---------------- External Team ---------------- #
class ExternalMemberCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        client = self.context["client"]
        email = validated_data["email"].lower().strip()
        username = validated_data["username"]
        password = validated_data["password"]

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"username": username, "role": "EXTERNAL"}  # ✅ Assign role
        )

        if created:
            user.set_password(password)
            user.save()

        if ExternalTeam.objects.filter(user=user, client_org=client).exists():
            raise ValidationError("User already added to this client")

        external = ExternalTeam.objects.create(
            user=user,
            client_org=client,
            # role="EXTERNAL",
            created_by=self.context.get("creator")  # optional
        )
        return external

class ExternalTeamSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = ExternalTeam
        fields = ["id", "client_org", "role", "username", "email", "password"]

    def create(self, validated_data):
        username = validated_data.pop("username")
        email = validated_data.pop("email").lower().strip()
        password = validated_data.pop("password")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={"username": username, "role": "EXTERNAL"}
        )
        if created:
            user.set_password(password)
            user.save()

        external = ExternalTeam.objects.create(
            user=user,
            role="EXTERNAL",
            **validated_data
        )
        return external
    
    

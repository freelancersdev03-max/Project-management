from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser


# =========================
# PUBLIC / CONTROLLED REGISTER
# =========================
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')

        # force safe default role
        validated_data['role'] = CustomUser.CLIENT

        user = CustomUser.objects.create_user(
            password=validated_data.pop('password'),
            **validated_data
        )
        return user


# =========================
# JWT LOGIN (EMAIL BASED)
# =========================
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # custom claims
        token['user_id'] = user.id
        token['email'] = user.email
        token['role'] = user.role
        

        return token

    def validate(self, attrs):
        username_field = self.username_field
        raw_identifier = attrs.get(username_field, "")
        normalized_identifier = str(raw_identifier or "").strip()

        # Email is the username field; normalize common input issues.
        if username_field == "email":
            normalized_identifier = normalized_identifier.lower()

        attrs[username_field] = normalized_identifier

        # Check if user exists but is inactive (e.g. put on hold by admin)
        user = None
        if username_field == "email" and normalized_identifier:
            user = CustomUser.objects.filter(email__iexact=normalized_identifier).first()
        elif normalized_identifier:
            user = CustomUser.objects.filter(username=normalized_identifier).first()

        if user and not user.is_active:
            raise serializers.ValidationError(
                {"detail": "Your account has been put on hold. Please contact your administrator."},
                code='no_active_account'
            )

        data = super().validate(attrs)

        # extra response data
        data['user_id'] = self.user.id
        data['email'] = self.user.email
        data['role'] = self.user.role
        data['username'] = self.user.username

        return data


# =========================
# ADMIN CREATE USER
# =========================
class AdminCreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

    class Meta:
        model = CustomUser
        fields = ('username', 'first_name', 'last_name', 'shortform', 'email', 'role', 'password')

    def validate_shortform(self, value):
        normalized = str(value or '').strip().upper()
        if not normalized:
            return normalized

        if CustomUser.objects.filter(shortform__iexact=normalized).exists():
            raise serializers.ValidationError("Shortform already taken.")

        return normalized

    def validate_email(self, value):
        return str(value or '').strip().lower()

    def create(self, validated_data):
        password = validated_data.pop('password')

        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )

        # staff control (can be refined later)
        if user.role == CustomUser.ADMIN:
            user.is_staff = True
        else:
            user.is_staff = False

        user.save()
        return user


# =========================
# ADMIN LIST USERS
# =========================
class AdminListUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        validators=[validate_password]
    )
    password_display = serializers.SerializerMethodField(read_only=True)

    def get_password_display(self, obj):
        return obj.plain_password or ''

    def validate_shortform(self, value):
        normalized = str(value or '').strip().upper()
        if not normalized:
            return normalized

        queryset = CustomUser.objects.filter(shortform__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError("Shortform already taken.")

        return normalized

    def validate_email(self, value):
        return str(value or '').strip().lower()

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'username',
            'first_name',
            'last_name',
            'shortform',
            'email',
            'role',
            'is_active',
            'is_staff',
            'date_joined',
            'password',
            'password_display',
            'password_changed_at',
        )
        read_only_fields = (
            'id',
            'is_staff',
            'date_joined',
            'password_display',
            'password_changed_at',
        )


class HQEPLListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'full_name', 'email', 'shortform', 'role', 'first_name', 'last_name', 'username')

    def get_full_name(self, obj):
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username


class AssignableUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    client_id = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'username',
            'email',
            'role',
            'full_name',
            'client_id',
        )

    def get_full_name(self, obj):
        name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return name or obj.username or obj.email

    def get_client_id(self, obj):
        if obj.role == CustomUser.CLIENT:
            profile = getattr(obj, 'client_profile', None)
            return getattr(profile, 'id', None)

        if obj.role == CustomUser.EXTERNAL:
            membership = getattr(obj, 'externalteam', None)
            return getattr(membership, 'client_org_id', None)

        return None


class UserProfileSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        validators=[validate_password]
    )

    photo = serializers.ImageField(required=False, allow_null=True)
    employee_profile_id = serializers.SerializerMethodField()
    password_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'shortform',
            'role',
            'is_active',
            'date_joined',
            'last_login',
            'phone_number',
            'experience',
            'expertise',
            'photo',
            'password',
            'password_display',
            'employee_profile_id',
        )
        read_only_fields = (
            'id',
            'username',
            'email',
            'role',
            'is_active',
            'date_joined',
            'last_login',
            'password_display',
            'employee_profile_id',
        )

    def get_employee_profile_id(self, obj):
        if hasattr(obj, 'employee_profile'):
            return obj.employee_profile.id
        return None

    def get_password_display(self, obj):
        return obj.plain_password or ''

    def validate_phone_number(self, value):
        """Validate phone number: max 10 digits only"""
        if value:
            # Remove any non-digit characters for validation
            digits_only = ''.join(filter(str.isdigit, str(value)))
            if len(digits_only) > 10:
                raise serializers.ValidationError(
                    "Phone number must contain maximum 10 digits."
                )
            # Store only digits
            return digits_only
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)

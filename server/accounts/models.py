from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class CustomUser(AbstractUser):
    ADMIN = "ADMIN"
    HQEPL = "HQEPL"
    MLS = "MLS"
    SGM = "SGM"
    EMPLOYEE = "EMPLOYEE"
    CLIENT = "CLIENT"
    EXTERNAL = "EXTERNAL"
    SENIOR = "SENIOR"

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (HQEPL, "HQEPL"),
        (MLS, "MLS"),
        (SGM, "SGM"),
        (EMPLOYEE, "Employee"),
        (CLIENT, "Client"),
        (EXTERNAL, "External"),
        (SENIOR, "Senior"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES,  default='EMPLOYEE')
    shortform = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(unique=True)

    # Shared profile fields used by all role-based profile pages.
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    experience = models.CharField(max_length=255, blank=True, null=True)
    expertise = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    password_changed_at = models.DateTimeField(default=timezone.now)
    plain_password = models.CharField(max_length=255, blank=True, default='')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def set_password(self, raw_password):
        super().set_password(raw_password)
        self.password_changed_at = timezone.now()
        self.plain_password = str(raw_password or '')

    def __str__(self):
        return f"{self.email} ({self.role})"

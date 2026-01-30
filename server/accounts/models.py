from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ADMIN = "ADMIN"
    HQEPL = "HQEPL"
    SGM = "SGM"
    EMPLOYEE = "EMPLOYEE"
    CLIENT = "CLIENT"
    EXTERNAL="EXTERNAL"
    

    ROLE_CHOICES = [
        (ADMIN, "Admin"),
        (HQEPL, "HQEPL"),
        (SGM, "SGM"),
        (EMPLOYEE, "Employee"),
        (CLIENT, "Client"),
        (EXTERNAL,"External"),
        
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES,  default='EMPLOYEE')
    email = models.EmailField(unique=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.role})"

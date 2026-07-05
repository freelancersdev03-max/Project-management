import os
import sys

# 1. Setup paths and env BEFORE ANY OTHER IMPORTS
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
# Just call setup, it handles checks internally or we let it error if already configured (unlikely here)
django.setup()

# 2. NOW import Django/DRF components
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from django.contrib.auth import get_user_model
from clients.views import ClientDetailView
from clients.models import Client

User = get_user_model()

def test_internal_delete():
    print("--- Starting Internal Delete Test ---")
    
    # 1. Create a dummy client to delete
    print("Creating dummy client...")
    
    email = "todelete_test@example.com"
    
    # Ensure cleanup from previous runs
    try:
        User.objects.filter(email=email).delete()
    except Exception as e:
        print(f"Cleanup warning: {e}")
    
    user = User.objects.create_user(username="todelete_test", email=email, password="password", role="CLIENT")
    
    # Create Client
    client = Client.objects.create(
        user=user, 
        company_name="Delete MeCorp",
        contact_email=email,
        phone="0000000000"
    )
    client_id = client.id
    print(f"Created Client ID: {client_id}, User ID: {user.id}")

    # 2. Get Admin User
    admin = User.objects.filter(role="ADMIN").first()
    if not admin:
        print("!! CRITICAL: No Admin user found via ORM. Creating a temp admin.")
        admin = User.objects.create_superuser("temp_admin", "admin@test.com", "password", role="ADMIN")
    
    print(f"Using Admin: {admin.email} (ID: {admin.id}, Role: {admin.role})")

    # 3. Simulate Request
    factory = APIRequestFactory()
    view = ClientDetailView.as_view()
    
    request = factory.delete(f'/api/clients/{client_id}/')
    force_authenticate(request, user=admin)
    
    print(f"Calling DELETE /api/clients/{client_id}/ ...")
    try:
        response = view(request, pk=client_id)
        print(f"Response Status: {response.status_code}")
        print(f"Response Data: {response.data}")
    except Exception as e:
        print(f"!! EXCEPTION during view execution: {e}")
        import traceback
        traceback.print_exc()

    # 4. Verify Deletion
    client_exists = Client.objects.filter(id=client_id).exists()
    print(f"Client {client_id} exists after delete? {client_exists}")
    
    user_exists = User.objects.filter(email=email).exists()
    print(f"User {email} exists after delete? {user_exists}")
    
    if not client_exists and not user_exists:
        print("--- TEST PASSED: Client and User deleted successfully ---")
    else:
        print("--- TEST FAILED: Deletion incomplete ---")

if __name__ == "__main__":
    try:
        test_internal_delete()
    except Exception as e:
        print(f"Global Error: {e}")

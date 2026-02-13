import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from clients.models import Client
from projects.models import Project
from django.contrib.auth import get_user_model

User = get_user_model()

def check_client_assignments():
    print("--- Checking Client Assignments ---")
    clients = Client.objects.all()
    for client in clients:
        assigned_sgms = client.assigned_sgms.all()
        print(f"Client ID: {client.id}, Name: {client.company_name}")
        print(f"  Assigned SGMs: {[sgm.email + ' (ID: ' + str(sgm.id) + ')' for sgm in assigned_sgms]}")
        
        projects = Project.objects.filter(client=client)
        print(f"  Projects Count: {projects.count()}")
        for p in projects:
             print(f"    - Project ID: {p.id}, Name: {p.name}, Assigned SGM: {p.assigned_sgm}")

    print("\n--- Checking SGMs ---")
    sgms = User.objects.filter(role="SGM")
    for sgm in sgms:
        print(f"SGM ID: {sgm.id}, Email: {sgm.email}")
        # explicit check manually
        assigned = Client.objects.filter(assigned_sgms=sgm)
        print(f"  Explicitly Assigned Clients: {[c.id for c in assigned]}")

if __name__ == "__main__":
    check_client_assignments()

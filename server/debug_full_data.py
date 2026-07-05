import os
import django
import sys
import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from clients.models import Client
from projects.models import Project
from ddtme.models import BigTask
from django.contrib.auth import get_user_model

User = get_user_model()

# Find Client
try:
    # Try ID 17 first, else search string
    client = Client.objects.filter(id=17).first()
    if not client:
        client = Client.objects.filter(company_name__icontains="ola").first()
    
    if not client:
        print("Client 'Ola' not found.")
        sys.exit()

    print(f"\n=== CLIENT: {client.company_name} (ID: {client.id}) ===")
    print(f"Internal Team IDs: {[u.id for u in client.internal_team.all()]}")
    
    # Projects
    print(f"\n=== PROJECTS ===")
    projects = Project.objects.filter(client=client)
    for p in projects:
        print(f"[{p.id}] {p.name} (Status: {p.status})")
        print(f"    Assigned Employees: {[e.user.id for e in p.assigned_employees.all()]}")

    # Big Tasks
    print(f"\n=== BIG TASKS ===")
    big_tasks = BigTask.objects.filter(project__client=client)
    print(f"Total Big Tasks: {big_tasks.count()}")
    
    for t in big_tasks:
        print(f"[{t.id}] {t.title} | {t.project.name} | {t.start_date} to {t.target_date}", flush=True)

except Exception as e:
    print(f"Error: {e}", flush=True)

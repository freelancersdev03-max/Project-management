import os
import django
import sys
import datetime

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
# Add parent dir just in case
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from clients.models import Client
from projects.models import Project
from ddtme.models import BigTask
from django.contrib.auth import get_user_model

User = get_user_model()
client_id = 17

try:
    client = Client.objects.get(id=client_id)
    print(f"--- Client: {client.company_name} (ID: {client.id}) ---")
    
    print(f"Internal Team: {[u.email for u in client.internal_team.all()]}")
    print(f"Assigned SGMs: {[u.email for u in client.assigned_sgms.all()]}")

    print("\n--- Projects ---")
    projects = Project.objects.filter(client=client)
    for p in projects:
        print(f"Project: {p.name} (ID: {p.id}, Status: {p.status})")
        print(f"  Assigned Employees: {[e.user.email for e in p.assigned_employees.all()]}")

    print("\n--- Big Tasks ---")
    # Check Feb 2026
    month = 2
    year = 2026
    
    # Logic from view: start_date__lte=month_end, target_date__gte=month_start
    # Feb 2026: 2026-02-01 to 2026-02-28
    month_start = datetime.date(year, month, 1)
    month_end = datetime.date(year, month, 28)
    
    big_tasks = BigTask.objects.filter(project__client=client)
    print(f"Total Big Tasks for Client: {big_tasks.count()}")
    
    filtered_tasks = big_tasks.filter(start_date__lte=month_end, target_date__gte=month_start)
    print(f"Big Tasks overlapping Feb 2026: {filtered_tasks.count()}")
    
    for t in big_tasks:
        overlaps = (t.start_date <= month_end) and (t.target_date >= month_start)
        print(f"Task: {t.title} ({t.start_date} to {t.target_date}) - Overlaps Feb 2026? {overlaps}")

except Client.DoesNotExist:
    print(f"Client {client_id} not found.")
except Exception as e:
    print(f"Error: {e}")

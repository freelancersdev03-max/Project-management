import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from clients.models import Client

User = get_user_model()

def list_and_assign():
    sgms = User.objects.filter(role="SGM")
    print(f"Found {sgms.count()} SGMs.")
    for s in sgms:
        print(f"SGM: {s.email} (ID: {s.id})")

    # If only one SGM, assign to Client 9 automatically
    if sgms.count() == 1:
        admin_sgm = sgms.first()
        try:
            client = Client.objects.get(id=9)
            client.assigned_sgms.add(admin_sgm)
            client.save()
            print(f"SUCCESS: Assigned SGM {admin_sgm.email} to Client 9.")
        except Client.DoesNotExist:
            print("Client 9 not found.")
    else:
        print("Multiple SGMs found. Please specify which one to assign.")

if __name__ == "__main__":
    list_and_assign()

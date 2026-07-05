import os
import django
import sys

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from clients.models import Client
from django.contrib.auth import get_user_model

User = get_user_model()

def check():
    print("CHECKING CLIENT 9...")
    try:
        c9 = Client.objects.get(id=9)
        print(f"Client 9 Found: {c9.company_name}")
        sgms = c9.assigned_sgms.all()
        print(f"Assigned SGMs to Client 9: {[u.email for u in sgms]}")
    except Client.DoesNotExist:
        print("Client 9 DOES NOT EXIST.")

    print("\nCHECKING ALL SGMS...")
    sgms = User.objects.filter(role="SGM")
    for s in sgms:
        print(f"SGM: {s.email} (ID: {s.id})")
        clients = s.assigned_clients.all()
        print(f"  Assigned Clients: {[c.id for c in clients]}")

if __name__ == "__main__":
    check()

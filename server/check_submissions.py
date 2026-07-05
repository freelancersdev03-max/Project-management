import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), 'server'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from ddtme.models import DDTMESubmission

print("--- Checking DDTME Submissions ---")
submissions = DDTMESubmission.objects.all()
print(f"Total Submissions: {submissions.count()}")

for sub in submissions:
    print(f"ID: {sub.id} | Client: {sub.client.id} ({sub.client.company_name}) | M/Y: {sub.month}/{sub.year} | Status: {sub.status} | SubmittedBy: {sub.submitted_by}")

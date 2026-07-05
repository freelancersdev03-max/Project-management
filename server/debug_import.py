import os
import django
import sys

print("Setting up Django environment...")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
print("Django setup complete.")

print("Importing ddtme.models...")
try:
    from ddtme import models
    print("ddtme.models imported successfully.")
except Exception as e:
    print(f"Error importing ddtme.models: {e}")

print("Importing ddtme.views...")
try:
    from ddtme import views
    print("ddtme.views imported successfully.")
except Exception as e:
    print(f"Error importing ddtme.views: {e}")

import os
import django
from datetime import date
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from ddtme.views import BigTaskViewSet
from ddtme.models import BigTask
from projects.models import Project
from clients.models import Client

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

User = get_user_model()

def run_test():
    with open('verification_result.txt', 'w') as f:
        f.write("--- Starting Monthly Filtering Test ---\n")

        # 1. Setup Data
        # Create a user for authentication
        try:
            user, _ = User.objects.get_or_create(username='testuser', email='test@example.com')
            
            # Create Client
            client, _ = Client.objects.get_or_create(name='Test Client Filtering')
            
            # Create Project
            project, _ = Project.objects.get_or_create(name='Test Project Filtering', client=client)

            # Clear existing tasks for this project
            BigTask.objects.filter(project=project).delete()

            # Create Tasks
            # Task 1: Jan 1 - Jan 31 (Only Jan)
            t1 = BigTask.objects.create(
                project=project, title='Task Jan', 
                start_date=date(2025, 1, 1), target_date=date(2025, 1, 31)
            )
            # Task 2: Feb 1 - Mar 31 (Feb and Mar)
            t2 = BigTask.objects.create(
                project=project, title='Task Feb-Mar', 
                start_date=date(2025, 2, 1), target_date=date(2025, 3, 31)
            )
            # Task 3: Jan 15 - Feb 15 (Jan and Feb)
            t3 = BigTask.objects.create(
                project=project, title='Task Jan-Feb', 
                start_date=date(2025, 1, 15), target_date=date(2025, 2, 15)
            )

            f.write("Created 3 Test Tasks.\n")

            # 2. Test Filtering
            factory = RequestFactory()
            view = BigTaskViewSet.as_view({'get': 'list'})

            def check_month(month, year, expected_titles):
                url = f'/ddtme/big-tasks/?client_id={client.id}&month={month}&year={year}'
                request = factory.get(url)
                request.user = user
                response = view(request)
                
                data = response.data
                if hasattr(data, 'results'): 
                     data = data.results
                
                titles = sorted([t['title'] for t in data])
                expected_titles = sorted(expected_titles)

                if titles == expected_titles:
                    f.write(f"[PASS] {year}-{month}: Got {titles}\n")
                else:
                    f.write(f"[FAIL] {year}-{month}: Expected {expected_titles}, Got {titles}\n")

            # Test JAN 2025
            check_month(1, 2025, ['Task Jan', 'Task Jan-Feb'])

            # Test FEB 2025
            check_month(2, 2025, ['Task Feb-Mar', 'Task Jan-Feb'])

            # Test MAR 2025
            check_month(3, 2025, ['Task Feb-Mar'])

            # Test APR 2025
            check_month(4, 2025, [])

            f.write("--- Test Finished ---\n")
        except Exception as e:
            f.write(f"An error occurred: {e}\n")

if __name__ == "__main__":
    run_test()

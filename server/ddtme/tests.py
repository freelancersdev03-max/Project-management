from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from clients.models import Client as ClientOrg
from employees.models import Employee
from projects.models import Project
from .models import DDTMESubmission, BigTask, ManDayEntry
from datetime import date

User = get_user_model()


def create_client_org(*, label, user_email):
    client_user = User.objects.create_user(
        username=f"{label}_client_user",
        email=user_email,
        password="password",
        role=User.CLIENT,
    )
    return ClientOrg.objects.create(
        user=client_user,
        company_name=f"{label} Client",
        contact_email=f"contact+{label}@example.com",
        phone="1234567890",
    )


class DDTMESGMVisibilityTest(TestCase):
    def setUp(self):
        self.client_obj = create_client_org(label="sgm_visibility", user_email="client_sgm_visibility@example.com")
        self.employee = User.objects.create_user(
            username='emp',
            email='emp@example.com',
            password='password',
            role=User.EMPLOYEE,
        )
        self.sgm = User.objects.create_user(
            username='sgm',
            email='sgm@example.com',
            password='password',
            role=User.SGM,
        )
        
        # Submissions
        self.submission = DDTMESubmission.objects.create(
            client=self.client_obj,
            month=2,
            year=2026,
            status='Submitted',
            submitted_by=self.employee
        )

    def test_sgm_sees_submission(self):
        client = APIClient()
        client.force_authenticate(user=self.sgm)
        
        response = client.get(f'/api/ddtme/submissions/?client_id={self.client_obj.id}&month=2&year=2026')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # SGM should see the submission
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], 'Submitted')

class BigTaskFilteringTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@example.com',
            password='password',
            role=User.EMPLOYEE,
        )
        self.client_obj = create_client_org(label="bigtask_filtering", user_email="client_bigtask_filtering@example.com")
        self.project = Project.objects.create(
            name='Test Project',
            client=self.client_obj,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
        )
        self.client_js = APIClient()
        self.client_js.force_authenticate(user=self.user)

    def test_overlapping_task(self):
        # Task spans Jan 1 to Mar 31
        task = BigTask.objects.create(
            project=self.project, 
            title='Overlay Task',
            start_date=date(2025, 1, 1),
            target_date=date(2025, 3, 31)
        )

        # Filter for FEB (Should match)
        response = self.client_js.get(f'/api/ddtme/big-tasks/?client_id={self.client_obj.id}&month=2&year=2025')
        
        self.assertEqual(response.status_code, 200)
        data = response.data
        if 'results' in data:
            data = data['results']
            
        print(f"\nResponse Data for Feb: {data}")
        self.assertEqual(len(data), 1, "Task should be found in Feb")
        self.assertEqual(data[0]['id'], task.id)

    def test_non_overlapping_task(self):
        # Task in Jan only
        task = BigTask.objects.create(
            project=self.project, 
            title='Jan Task',
            start_date=date(2025, 1, 1),
            target_date=date(2025, 1, 31)
        )

        # Filter for MAR (Should NOT match)
        response = self.client_js.get(f'/api/ddtme/big-tasks/?client_id={self.client_obj.id}&month=3&year=2025')
        
        data = response.data
        if 'results' in data:
            data = data['results']
            
        print(f"\nResponse Data for Mar: {data}")
        self.assertEqual(len(data), 0, "Task should NOT be found in Mar")


class ManDayEntryPersonKeyTestCase(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.viewer = User.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='password',
            role=User.EMPLOYEE,
        )
        self.api_client.force_authenticate(user=self.viewer)

        self.client_obj = create_client_org(label="mls_person_key", user_email="client_mls_person_key@example.com")
        self.project = Project.objects.create(
            name='MLS Tracking Project',
            client=self.client_obj,
            start_date=date(2026, 3, 1),
            end_date=date(2026, 3, 31),
        )
        self.big_task = BigTask.objects.create(
            project=self.project,
            title='Track MLS Hours',
            start_date=date(2026, 3, 1),
            target_date=date(2026, 3, 31),
        )

        self.mls_user = User.objects.create_user(
            username='mls_owner',
            email='mls.owner@example.com',
            password='password',
            role=User.HQEPL,
        )
        self.regular_user = User.objects.create_user(
            username='regular_emp',
            email='regular_emp@example.com',
            password='password',
            role=User.EMPLOYEE,
        )

        self.mls_employee, _ = Employee.objects.get_or_create(user=self.mls_user)
        self.regular_employee, _ = Employee.objects.get_or_create(user=self.regular_user)

        self.mls_entry = ManDayEntry.objects.create(
            employee=self.mls_employee,
            month=3,
            year=2026,
            big_task=self.big_task,
            plan_hours='2.00',
            off_hours='1.00',
        )
        self.regular_entry = ManDayEntry.objects.create(
            employee=self.regular_employee,
            month=3,
            year=2026,
            big_task=self.big_task,
            plan_hours='4.00',
            off_hours='0.00',
        )

    def test_list_returns_stable_person_key_for_mls_entries(self):
        response = self.api_client.get(
            f'/api/ddtme/man-day-entries/?client_id={self.client_obj.id}&month=3&year=2026'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

        entries_by_id = {entry['id']: entry for entry in response.data}
        self.assertEqual(entries_by_id[self.mls_entry.id]['person_key'], 'mls')
        self.assertEqual(entries_by_id[self.regular_entry.id]['person_key'], f'u-{self.regular_user.id}')

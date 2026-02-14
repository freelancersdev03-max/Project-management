from django.test import TestCase
from datetime import date
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from .models import BigTask
from projects.models import Project
from clients.models import Client

User = get_user_model()

class BigTaskFilteringTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client = Client.objects.create(name='Test Client', contact_email="test@test.com")
        self.project = Project.objects.create(name='Test Project', client=self.client, start_date=date(2025,1,1), end_date=date(2025,12,31))
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
        response = self.client_js.get(f'/api/ddtme/big-tasks/?client_id={self.client.id}&month=2&year=2025')
        
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
        response = self.client_js.get(f'/api/ddtme/big-tasks/?client_id={self.client.id}&month=3&year=2025')
        
        data = response.data
        if 'results' in data:
            data = data['results']
            
        print(f"\nResponse Data for Mar: {data}")
        self.assertEqual(len(data), 0, "Task should NOT be found in Mar")

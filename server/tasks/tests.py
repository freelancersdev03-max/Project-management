from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Task


User = get_user_model()


class TaskVisibilityTests(APITestCase):
    def setUp(self):
        self.sgm = User.objects.create_user(
            username='sgm_user',
            email='sgm@example.com',
            password='testpass123',
            role=User.SGM,
        )
        self.employee_one = User.objects.create_user(
            username='employee_one',
            email='employee1@example.com',
            password='testpass123',
            role=User.EMPLOYEE,
        )
        self.employee_two = User.objects.create_user(
            username='employee_two',
            email='employee2@example.com',
            password='testpass123',
            role=User.EMPLOYEE,
        )

        due_date = date.today() + timedelta(days=5)

        self.ddfms_delegated = Task.objects.create(
            title='DDFMS delegated task',
            target_date=due_date,
            assigned_to=self.employee_one,
            assigned_by=self.sgm,
            source_module='DDFMS',
        )
        self.ddfms_self = Task.objects.create(
            title='DDFMS self task',
            target_date=due_date,
            assigned_to=self.sgm,
            assigned_by=self.sgm,
            source_module='DDFMS',
        )
        self.direct_delegated = Task.objects.create(
            title='Direct delegated task',
            target_date=due_date,
            assigned_to=self.employee_one,
            assigned_by=self.sgm,
            source_module='DIRECT',
        )
        self.received_task = Task.objects.create(
            title='Task received by SGM',
            target_date=due_date,
            assigned_to=self.sgm,
            assigned_by=self.employee_two,
            source_module='DIRECT',
        )

    def _as_task_list(self, response_data):
        if isinstance(response_data, dict):
            return response_data.get('results', [])
        return response_data

    def test_sgm_task_list_hides_ddfms_tasks_delegated_to_others(self):
        self.client.force_authenticate(user=self.sgm)

        response = self.client.get('/api/tasks/')

        self.assertEqual(response.status_code, 200)
        rows = self._as_task_list(response.data)
        row_ids = {row['id'] for row in rows}

        self.assertNotIn(self.ddfms_delegated.id, row_ids)
        self.assertIn(self.ddfms_self.id, row_ids)
        self.assertIn(self.direct_delegated.id, row_ids)
        self.assertIn(self.received_task.id, row_ids)

    def test_sgm_member_view_still_returns_ddfms_tasks_for_assigned_member(self):
        self.client.force_authenticate(user=self.sgm)

        response = self.client.get(f'/api/tasks/?assigned_to={self.employee_one.id}')

        self.assertEqual(response.status_code, 200)
        rows = self._as_task_list(response.data)
        row_ids = {row['id'] for row in rows}

        self.assertIn(self.ddfms_delegated.id, row_ids)
        self.assertIn(self.direct_delegated.id, row_ids)

    def test_assigned_by_name_is_ddfms_for_ddfms_tasks(self):
        self.client.force_authenticate(user=self.employee_one)

        response = self.client.get('/api/tasks/')

        self.assertEqual(response.status_code, 200)
        rows = self._as_task_list(response.data)
        rows_by_id = {row['id']: row for row in rows}

        self.assertEqual(rows_by_id[self.ddfms_delegated.id]['assigned_by_name'], 'DDFMS')
        self.assertEqual(rows_by_id[self.direct_delegated.id]['assigned_by_name'], self.sgm.username)

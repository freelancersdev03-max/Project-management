from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import CustomUser
from .models import RC7Plan, RC7Submission


class RC7PlanningViewTests(TestCase):
	def setUp(self):
		self.employee_a = CustomUser.objects.create_user(
			username='employee_a',
			email='employee_a@example.com',
			password='password123',
			role=CustomUser.EMPLOYEE,
		)
		self.employee_b = CustomUser.objects.create_user(
			username='employee_b',
			email='employee_b@example.com',
			password='password123',
			role=CustomUser.EMPLOYEE,
		)

		self.client = APIClient()
		self.start = '2026-03-10'
		self.end = '2026-03-10'
		self.date_key = '2026-03-10'

	def test_get_returns_wrapped_plan_and_submission_state_for_self(self):
		RC7Plan.objects.create(
			employee=self.employee_a,
			date=self.date_key,
			location='office',
			deliverable='Prepare report',
			plan_type='sat',
		)
		RC7Submission.objects.create(
			employee=self.employee_a,
			plan_type='sat',
			start_date=self.start,
			end_date=self.end,
			is_submitted=True,
		)

		self.client.force_authenticate(user=self.employee_a)
		response = self.client.get(
			'/api/rc7/planning/',
			{
				'type': 'sat',
				'start': self.start,
				'end': self.end,
			},
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('plans', response.data)
		self.assertIn('is_submitted', response.data)
		self.assertIn('last_updated', response.data)
		self.assertTrue(response.data['is_submitted'])
		self.assertIsNotNone(response.data['last_updated'])
		self.assertIn(str(self.employee_a.id), response.data['plans'])
		self.assertIn(self.date_key, response.data['plans'][str(self.employee_a.id)])

	def test_post_updates_submission_flag(self):
		self.client.force_authenticate(user=self.employee_a)
		payload = {
			'type': 'sat',
			'start': self.start,
			'end': self.end,
			'is_submitted': True,
			'plan': {
				str(self.employee_a.id): {
					self.date_key: {
						'location': 'office',
						'deliverables': ['Task A'],
					}
				}
			},
		}

		response = self.client.post('/api/rc7/planning/', payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('last_updated', response.data)
		self.assertIsNotNone(response.data['last_updated'])
		self.assertTrue(
			RC7Submission.objects.filter(
				employee=self.employee_a,
				plan_type='sat',
				start_date=self.start,
				end_date=self.end,
				is_submitted=True,
			).exists()
		)

	def test_unauthorized_user_query_does_not_leak_other_submission_status(self):
		RC7Submission.objects.create(
			employee=self.employee_a,
			plan_type='sat',
			start_date=self.start,
			end_date=self.end,
			is_submitted=True,
		)

		self.client.force_authenticate(user=self.employee_b)
		response = self.client.get(
			'/api/rc7/planning/',
			{
				'type': 'sat',
				'start': self.start,
				'end': self.end,
				'user': self.employee_a.id,
			},
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('plans'), {})
		self.assertFalse(response.data.get('is_submitted'))
		self.assertIsNone(response.data.get('last_updated'))

	def test_clearing_deliverables_preserves_empty_row_for_date(self):
		self.client.force_authenticate(user=self.employee_a)

		create_payload = {
			'type': 'sat',
			'start': self.start,
			'end': self.end,
			'plan': {
				str(self.employee_a.id): {
					self.date_key: {
						'location': 'office',
						'deliverables': ['Task A'],
					}
				}
			},
		}
		create_res = self.client.post('/api/rc7/planning/', create_payload, format='json')
		self.assertEqual(create_res.status_code, status.HTTP_200_OK)

		plan = RC7Plan.objects.get(employee=self.employee_a, date=self.date_key, plan_type='sat')
		first_updated_at = plan.updated_at

		clear_payload = {
			'type': 'sat',
			'start': self.start,
			'end': self.end,
			'plan': {
				str(self.employee_a.id): {
					self.date_key: {
						'location': '',
						'deliverables': [],
					}
				}
			},
		}
		clear_res = self.client.post('/api/rc7/planning/', clear_payload, format='json')
		self.assertEqual(clear_res.status_code, status.HTTP_200_OK)

		plan.refresh_from_db()
		self.assertEqual(plan.location, '')
		self.assertEqual(plan.deliverable, '')
		self.assertGreaterEqual(plan.updated_at, first_updated_at)

		fetch_res = self.client.get(
			'/api/rc7/planning/',
			{
				'type': 'sat',
				'start': self.start,
				'end': self.end,
			},
		)
		self.assertEqual(fetch_res.status_code, status.HTTP_200_OK)
		cell = fetch_res.data['plans'][str(self.employee_a.id)][self.date_key]
		self.assertEqual(cell['location'], '')
		self.assertEqual(cell['deliverables'], [])

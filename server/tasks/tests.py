from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Task


User = get_user_model()


class TaskAtsFormulaTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="ats_user",
			email="ats_user@example.com",
			password="testpass123",
			role=User.EMPLOYEE,
		)

	def test_delayed_same_start_and_target_next_day_is_fifty_percent(self):
		base_date = date(2026, 3, 11)

		task = Task.objects.create(
			title="Same day target delayed by one day",
			assigned_to=self.user,
			assigned_by=self.user,
			start_date=base_date,
			target_date=base_date,
			completion_date=base_date + timedelta(days=1),
		)

		task.refresh_from_db()
		self.assertEqual(task.status, "Delayed")
		self.assertEqual(task.ats_score, 50.0)

	def test_delayed_same_start_and_target_two_days_is_thirty_three_point_thirty_three(self):
		base_date = date(2026, 3, 11)

		task = Task.objects.create(
			title="Same day target delayed by two days",
			assigned_to=self.user,
			assigned_by=self.user,
			start_date=base_date,
			target_date=base_date,
			completion_date=base_date + timedelta(days=2),
		)

		task.refresh_from_db()
		self.assertEqual(task.status, "Delayed")
		self.assertEqual(task.ats_score, 33.33)

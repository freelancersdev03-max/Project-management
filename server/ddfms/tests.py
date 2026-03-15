from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from clients.models import Client
from tasks.models import Task

from .models import DDFMSDeliverable, DDFMSPlan, DDFMSStep
from .serializers import DDFMSStepSerializer
from .views import sync_ddfms_step_task


User = get_user_model()


class DDFMSStepStartDateTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(
            username='sgm_actor',
            email='sgm_actor@example.com',
            password='testpass123',
            role=User.SGM,
        )
        self.responsible = User.objects.create_user(
            username='employee_responsible',
            email='employee_responsible@example.com',
            password='testpass123',
            role=User.EMPLOYEE,
        )
        self.client_user = User.objects.create_user(
            username='client_owner',
            email='client_owner@example.com',
            password='testpass123',
            role=User.CLIENT,
        )
        self.client = Client.objects.create(
            user=self.client_user,
            company_name='Acme Pvt Ltd',
            contact_email='contact@acme.example',
            phone='9999999999',
            address='Test Address',
            created_by=self.actor,
            status='active',
        )
        self.plan = DDFMSPlan.objects.create(
            client=self.client,
            month=3,
            year=2026,
            created_by=self.actor,
            updated_by=self.actor,
        )

    def test_step_serializer_exposes_start_date_from_deliverable(self):
        deliverable = DDFMSDeliverable.objects.create(
            plan=self.plan,
            title='Deliverable One',
            start_date=date(2026, 3, 5),
            is_submitted=True,
        )
        step = DDFMSStep.objects.create(
            deliverable=deliverable,
            step_number=1,
            responsible=self.responsible,
            target_date=date(2026, 3, 9),
        )

        serialized = DDFMSStepSerializer(step).data

        self.assertEqual(serialized['start_date'], '2026-03-05')
        self.assertEqual(serialized['target_date'], '2026-03-09')

    def test_sync_uses_deliverable_start_date_for_task_start_date(self):
        deliverable = DDFMSDeliverable.objects.create(
            plan=self.plan,
            title='Deliverable Two',
            start_date=date(2026, 3, 5),
            is_submitted=True,
        )
        step = DDFMSStep.objects.create(
            deliverable=deliverable,
            step_number=2,
            responsible=self.responsible,
            target_date=date(2026, 3, 15),
        )

        sync_ddfms_step_task(step, self.actor)

        task = Task.objects.get(source_module='DDFMS', source_ref_id=step.id)
        self.assertEqual(task.start_date, date(2026, 3, 5))
        self.assertEqual(task.target_date, date(2026, 3, 15))

    def test_sync_falls_back_to_step_target_date_if_start_date_missing(self):
        deliverable = DDFMSDeliverable.objects.create(
            plan=self.plan,
            title='Deliverable Three',
            start_date=None,
            is_submitted=True,
        )
        step = DDFMSStep.objects.create(
            deliverable=deliverable,
            step_number=3,
            responsible=self.responsible,
            target_date=date(2026, 3, 20),
        )

        sync_ddfms_step_task(step, self.actor)

        task = Task.objects.get(source_module='DDFMS', source_ref_id=step.id)
        self.assertEqual(task.start_date, date(2026, 3, 20))
        self.assertEqual(task.target_date, date(2026, 3, 20))

from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

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


class DDFMSTargetDateNormalizationTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(
            username='ddfms_actor',
            email='ddfms_actor@example.com',
            password='testpass123',
            role=User.SGM,
        )
        self.responsible = User.objects.create_user(
            username='ddfms_responsible',
            email='ddfms_responsible@example.com',
            password='testpass123',
            role=User.EMPLOYEE,
        )
        self.client_user = User.objects.create_user(
            username='ddfms_client_owner',
            email='ddfms_client_owner@example.com',
            password='testpass123',
            role=User.CLIENT,
        )
        self.client = Client.objects.create(
            user=self.client_user,
            company_name='Normalize Sunday Client',
            contact_email='normalize-sunday@example.com',
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
        self.api_client = APIClient()
        self.api_client.force_authenticate(user=self.actor)

    def test_deliverable_target_date_sunday_shifts_to_saturday(self):
        response = self.api_client.post(
            '/api/ddfms/deliverables/',
            {
                'plan': self.plan.id,
                'source_type': DDFMSDeliverable.SOURCE_MANUAL,
                'title': 'Sunday Target Deliverable',
                'target_date': '2026-03-22',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['target_date'], '2026-03-21')

    def test_step_target_date_sunday_shifts_to_saturday_and_sync_task(self):
        deliverable = DDFMSDeliverable.objects.create(
            plan=self.plan,
            title='Submitted Deliverable',
            is_submitted=True,
        )

        response = self.api_client.post(
            '/api/ddfms/steps/',
            {
                'deliverable': deliverable.id,
                'step_number': 1,
                'responsible': self.responsible.id,
                'target_date': '2026-03-22',
                'remarks': '',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['target_date'], '2026-03-21')

        step = DDFMSStep.objects.get(id=response.data['id'])
        synced_task = Task.objects.get(source_module='DDFMS', source_ref_id=step.id)
        self.assertEqual(step.target_date, date(2026, 3, 21))
        self.assertEqual(synced_task.target_date, date(2026, 3, 21))

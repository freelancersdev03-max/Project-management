from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from achievement.models import Achievement
from clients.models import Client
from ddtme.models import DDTMESubmission
from notifications.models import Notification
from projects.models import Project
from tasks.models import Task
from visit_agenda.models import VisitAgenda, VisitAgendaItem

User = get_user_model()


class NotificationSignalTests(TestCase):
    def setUp(self):
        self.sgm = User.objects.create_user(
            username="sgm-user",
            email="sgm@example.com",
            password="pass1234",
            role=User.SGM,
        )
        self.employee = User.objects.create_user(
            username="employee-user",
            email="employee@example.com",
            password="pass1234",
            role=User.EMPLOYEE,
        )
        self.client_user = User.objects.create_user(
            username="client-user",
            email="client@example.com",
            password="pass1234",
            role=User.CLIENT,
        )

        self.client_org = Client.objects.create(
            user=self.client_user,
            company_name="Acme Corp",
            contact_email="contact@acme.com",
            phone="1234567890",
            created_by=self.sgm,
        )
        self.client_org.assigned_sgms.add(self.sgm)
        self.project = Project.objects.create(
            name="Project Atlas",
            client=self.client_org,
            assigned_sgm=self.sgm,
            created_by=self.sgm,
        )
        Notification.objects.all().delete()

    def test_ddtme_submission_notifies_assigned_sgms(self):
        submission = DDTMESubmission.objects.create(
            client=self.client_org,
            month=3,
            year=2026,
            status="Draft",
            submitted_by=self.employee,
        )

        submission.status = "Submitted"
        submission.save()

        notification = Notification.objects.get(
            recipient=self.sgm,
            notification_type=Notification.DDTME_SUBMITTED,
        )

        self.assertIn("submitted DDTME", notification.message)
        self.assertEqual(notification.metadata["client_id"], self.client_org.id)
        self.assertEqual(notification.metadata["status"], "Submitted")

    def test_task_assignment_creates_notification(self):
        Task.objects.create(
            title="Prepare rollout plan",
            description="",
            project=self.project,
            client_org=self.client_org,
            assigned_to=self.employee,
            assigned_by=self.sgm,
            start_date=date(2026, 3, 13),
            target_date=date(2026, 3, 20),
        )

        notification = Notification.objects.get(
            recipient=self.employee,
            notification_type=Notification.TASK_ASSIGNED,
        )

        self.assertEqual(notification.title, "New task assigned")
        self.assertIn("Prepare rollout plan", notification.message)

    def test_ddtme_approval_creates_notification(self):
        submission = DDTMESubmission.objects.create(
            client=self.client_org,
            month=3,
            year=2026,
            status="Submitted",
            submitted_by=self.employee,
        )

        submission.status = "Approved"
        submission.approved_by = self.sgm
        submission.save()

        notification = Notification.objects.get(
            recipient=self.employee,
            notification_type=Notification.DDTME_APPROVED,
        )

        self.assertIn("Acme Corp", notification.message)
        self.assertEqual(notification.metadata["status"], "Approved")

    def test_project_member_addition_creates_notification(self):
        self.project.assigned_employees.add(self.employee.employee_profile)

        notification = Notification.objects.get(
            recipient=self.employee,
            notification_type=Notification.PROJECT_INCLUDED,
        )

        self.assertIn("Project Atlas", notification.message)
        self.assertEqual(notification.metadata["role"], "EMPLOYEE")

    def test_client_assignment_notifies_sgm_and_internal_team(self):
        sgm_two = User.objects.create_user(
            username="sgm-two",
            email="sgm2@example.com",
            password="pass1234",
            role=User.SGM,
        )
        employee_two = User.objects.create_user(
            username="employee-two",
            email="employee2@example.com",
            password="pass1234",
            role=User.EMPLOYEE,
        )

        Notification.objects.all().delete()

        self.client_org.assigned_sgms.add(sgm_two)
        self.client_org.internal_team.add(employee_two)

        sgm_notification = Notification.objects.get(
            recipient=sgm_two,
            notification_type=Notification.PROJECT_INCLUDED,
        )
        team_notification = Notification.objects.get(
            recipient=employee_two,
            notification_type=Notification.PROJECT_INCLUDED,
        )

        self.assertIn("assigned to the client", sgm_notification.message)
        self.assertEqual(sgm_notification.metadata["entity"], "CLIENT")
        self.assertEqual(sgm_notification.metadata["role"], "SGM")

        self.assertIn("client team", team_notification.message)
        self.assertEqual(team_notification.metadata["entity"], "CLIENT")
        self.assertEqual(team_notification.metadata["role"], "EMPLOYEE")

    def test_visit_agenda_assignment_shows_client_and_visit_date(self):
        agenda = VisitAgenda.objects.create(
            client=self.client_org,
            visit_date=date(2026, 4, 5),
            created_by=self.sgm,
        )
        agenda_item = VisitAgendaItem.objects.create(
            agenda=agenda,
            activity="Plant walkthrough",
            order=1,
        )

        agenda_item.kayaara_reps.add(self.employee)

        notification = Notification.objects.get(
            recipient=self.employee,
            notification_type=Notification.VISIT_AGENDA_INCLUDED,
        )

        self.assertEqual(notification.title, "Added to visit agenda")
        self.assertIn("Acme Corp", notification.message)
        self.assertIn("05 Apr 2026", notification.message)
        self.assertEqual(notification.metadata["client_id"], self.client_org.id)
        self.assertEqual(notification.metadata["visit_date"], "2026-04-05")

    def test_visit_agenda_assignment_is_not_duplicated_for_same_date(self):
        agenda = VisitAgenda.objects.create(
            client=self.client_org,
            visit_date=date(2026, 4, 5),
            created_by=self.sgm,
        )
        first_item = VisitAgendaItem.objects.create(
            agenda=agenda,
            activity="Prep",
            order=1,
        )
        second_item = VisitAgendaItem.objects.create(
            agenda=agenda,
            activity="Review",
            order=2,
        )

        first_item.kayaara_reps.add(self.employee)
        second_item.kayaara_reps.add(self.employee)

        notifications = Notification.objects.filter(
            recipient=self.employee,
            notification_type=Notification.VISIT_AGENDA_INCLUDED,
            metadata__agenda_id=agenda.id,
            metadata__visit_date="2026-04-05",
        )
        self.assertEqual(notifications.count(), 1)

    def test_achievement_assignment_notifies_all_internal_roles(self):
        admin_user = User.objects.create_user(
            username="admin-user",
            email="admin@example.com",
            password="pass1234",
            role=User.ADMIN,
        )
        kayaara_user = User.objects.create_user(
username="kayaara-user",
                email="kayaara@example.com",
            password="pass1234",
            role=User.KAYAARA,
        )
        employee_two = User.objects.create_user(
            username="employee-three",
            email="employee3@example.com",
            password="pass1234",
            role=User.EMPLOYEE,
        )

        Notification.objects.all().delete()

        achievement = Achievement.objects.create(
            employee=self.employee,
            title="Best Project Delivery",
            description="for completing Project Atlas before deadline",
            assigned_by=self.sgm,
        )

        achievement_notifications = Notification.objects.filter(
            notification_type=Notification.ACHIEVEMENT_AWARDED,
        )
        recipient_ids = set(achievement_notifications.values_list("recipient_id", flat=True))
        expected_recipient_ids = {
            self.employee.id,
            employee_two.id,
            self.sgm.id,
            admin_user.id,
            kayaara_user.id,
        }
        self.assertSetEqual(recipient_ids, expected_recipient_ids)

        employee_notification = achievement_notifications.get(recipient=self.employee)
        self.assertIn("Best Project Delivery", employee_notification.message)
        self.assertIn("assigned by sgm-user", employee_notification.message)
        self.assertEqual(employee_notification.metadata["achievement_id"], achievement.id)
        self.assertEqual(employee_notification.metadata["employee_id"], self.employee.id)
        self.assertEqual(employee_notification.metadata["assigned_by_id"], self.sgm.id)


class NotificationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="notify-user",
            email="notify@example.com",
            password="pass1234",
            role=User.EMPLOYEE,
        )
        self.other_user = User.objects.create_user(
            username="other-user",
            email="other@example.com",
            password="pass1234",
            role=User.EMPLOYEE,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_returns_only_current_user_notifications(self):
        Notification.objects.create(
            recipient=self.user,
            notification_type=Notification.TASK_ASSIGNED,
            title="Mine",
            message="Visible notification",
        )
        Notification.objects.create(
            recipient=self.other_user,
            notification_type=Notification.TASK_ASSIGNED,
            title="Other",
            message="Hidden notification",
        )

        response = self.client.get("/api/notifications/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["title"], "Mine")

    def test_mark_all_read_updates_only_current_user_notifications(self):
        mine = Notification.objects.create(
            recipient=self.user,
            notification_type=Notification.TASK_ASSIGNED,
            title="Mine",
            message="Unread",
        )
        other = Notification.objects.create(
            recipient=self.other_user,
            notification_type=Notification.TASK_ASSIGNED,
            title="Other",
            message="Unread",
        )

        response = self.client.post("/api/notifications/mark-all-read/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["marked_count"], 1)

        mine.refresh_from_db()
        other.refresh_from_db()
        self.assertTrue(mine.is_read)
        self.assertFalse(other.is_read)

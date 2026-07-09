from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client
from visit_agenda.models import VisitAgenda, VisitAgendaLog


User = get_user_model()


class VisitAgendaLogFlowTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()

        self.user = User.objects.create_user(
            username="agenda_owner",
            email="agenda_owner@example.com",
            password="AgendaPass@123",
            role="KAYAARA",
        )

        self.client_user = User.objects.create_user(
            username="client_user",
            email="client_user@example.com",
            password="ClientPass@123",
            role="CLIENT",
        )

        self.client_profile = Client.objects.create(
            user=self.client_user,
            company_name="Visit Log Client",
            contact_email="contact@visitlog.example",
            phone="9000000000",
            website="https://visitlog.example",
            address="Visit Street",
            status="active",
            created_by=self.user,
        )

        self.api_client.force_authenticate(user=self.user)

    def test_download_finalize_style_flow_creates_log_and_clears_active_agenda(self):
        save_payload = {
            "visit_date": "2026-03-29",
            "items": [
                {
                    "activity": "Review monthly output",
                    "start_time": "10:00",
                    "end_time": "11:00",
                    "output": "Updated progress summary",
                    "team_members": "Ops Team",
                    "kayaara_reps": [self.user.id],
                    "prior_tasks": "Collect process metrics",
                    "order": 1,
                }
            ],
        }

        save_response = self.api_client.put(
            f"/api/visit-agenda/clients/{self.client_profile.id}/",
            save_payload,
            format="json",
        )
        self.assertEqual(save_response.status_code, status.HTTP_200_OK)

        finalize_response = self.api_client.post(
            f"/api/visit-agenda/clients/{self.client_profile.id}/finalize/",
            {"visit_date": "2026-03-29"},
            format="json",
        )
        self.assertEqual(finalize_response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(VisitAgendaLog.objects.filter(client=self.client_profile).count(), 1)
        visit_log = VisitAgendaLog.objects.get(client=self.client_profile)
        self.assertEqual(str(visit_log.visit_date), "2026-03-29")
        self.assertEqual(len(visit_log.items), 1)
        self.assertEqual(visit_log.items[0]["activity"], "Review monthly output")

        active_agenda = VisitAgenda.objects.get(client=self.client_profile)
        self.assertEqual(active_agenda.items.count(), 0)

        agenda_response = self.api_client.get(f"/api/visit-agenda/clients/{self.client_profile.id}/")
        self.assertEqual(agenda_response.status_code, status.HTTP_200_OK)
        self.assertEqual(agenda_response.data.get("items"), [])

    def test_logs_list_and_detail_return_saved_snapshot(self):
        VisitAgendaLog.objects.create(
            client=self.client_profile,
            visit_date="2026-03-01",
            items=[
                {
                    "order": 1,
                    "activity": "Kickoff",
                    "start_time": "09:00",
                    "end_time": "09:30",
                    "output": "Scope alignment",
                    "team_members": "Core Team",
                    "kayaara_reps": [self.user.id],
                    "kayaara_rep_names": ["agenda_owner"],
                    "prior_tasks": "Read project brief",
                }
            ],
            created_by=self.user,
        )

        list_response = self.api_client.get(f"/api/visit-agenda/clients/{self.client_profile.id}/logs/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        log_id = list_response.data[0]["id"]
        detail_response = self.api_client.get(
            f"/api/visit-agenda/clients/{self.client_profile.id}/logs/{log_id}/"
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["visit_date"], "2026-03-01")
        self.assertEqual(detail_response.data["items"][0]["activity"], "Kickoff")

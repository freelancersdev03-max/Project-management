# Generated manually — only hqepl -> kayaara rename for MeetingAgendaItem M2M

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("meeting_agenda", "0005_rename_meeting_age_client__870a14_idx_meeting_age_client__ad5bfe_idx_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="meetingagendaitem",
            name="hqepl_reps",
        ),
        migrations.AddField(
            model_name="meetingagendaitem",
            name="kayaara_reps",
            field=models.ManyToManyField(
                blank=True,
                db_table="meeting_agenda_meetingagendaitem_hqepl_reps",
                related_name="kayaara_meeting_agenda_items",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]

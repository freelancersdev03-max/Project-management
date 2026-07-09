# Generated manually — only adds mom_file, description, and makes items nullable

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("meeting_agenda", "0004_visitagendalog"),
    ]

    operations = [
        migrations.AddField(
            model_name="meetingagendalog",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="meetingagendalog",
            name="mom_file",
            field=models.FileField(blank=True, null=True, upload_to="mom_files/"),
        ),
        migrations.AlterField(
            model_name="meetingagendalog",
            name="items",
            field=models.JSONField(blank=True, default=list, null=True),
        ),
    ]

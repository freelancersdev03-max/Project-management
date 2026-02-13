from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0011_alter_client_org_and_project"),
    ]

    operations = [
        migrations.AlterField(
            model_name="task",
            name="assigned_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="task_assignments_given",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="task",
            name="assigned_to",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="task_assignments_received",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]

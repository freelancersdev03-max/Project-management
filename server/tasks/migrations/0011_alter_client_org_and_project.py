from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
        ('projects', '0001_initial'),
        ('tasks', '0010_add_repeat_day_week'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='client_org',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='client_tasks', to='clients.client'),
        ),
        migrations.AlterField(
            model_name='task',
            name='project',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='project_tasks', to='projects.project'),
        ),
    ]

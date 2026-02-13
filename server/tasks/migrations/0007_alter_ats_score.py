from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0006_task_source_ref_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='ats_score',
            field=models.FloatField(blank=True, null=True),
        ),
    ]

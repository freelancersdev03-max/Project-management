from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0007_alter_ats_score'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='is_repeatable',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='task',
            name='repeat_duration',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]

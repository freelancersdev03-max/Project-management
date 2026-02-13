from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0009_rename_duration_add_end_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='repeat_day',
            field=models.CharField(blank=True, choices=[('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'), ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday'), ('Sunday', 'Sunday')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='repeat_week',
            field=models.CharField(blank=True, choices=[('First', 'First'), ('Second', 'Second'), ('Third', 'Third'), ('Fourth', 'Fourth'), ('Last', 'Last')], max_length=20, null=True),
        ),
    ]

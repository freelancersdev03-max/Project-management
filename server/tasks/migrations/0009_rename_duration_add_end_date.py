from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0008_add_repeatable_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='repeat_duration',
        ),
        migrations.AddField(
            model_name='task',
            name='repeat_frequency',
            field=models.CharField(blank=True, choices=[('Weekly', 'Weekly'), ('Monthly', 'Monthly')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='repeat_end_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]

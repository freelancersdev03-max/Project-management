from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0003_add_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='ats_score',
            field=models.FloatField(default=0.0),
        ),
    ]

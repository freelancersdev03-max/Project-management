from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0002_remove_task_created_at_remove_task_description_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
    ]

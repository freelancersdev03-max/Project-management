from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ddtme', '0008_increase_title_max_length_500'),
    ]

    operations = [
        migrations.AddField(
            model_name='bigtask',
            name='parent_task',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subtasks', to='ddtme.bigtask'),
        ),
    ]

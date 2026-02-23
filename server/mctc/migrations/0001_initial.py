from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='MCTCEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entry_date', models.DateField(db_index=True)),
                ('label', models.CharField(max_length=255)),
                ('entry_type', models.CharField(choices=[('normal', 'Normal'), ('task', 'Task')], default='normal', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mctc_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['entry_date', 'id'],
                'indexes': [models.Index(fields=['user', 'entry_date'], name='mctc_mctcen_user_id_7f4f53_idx')],
            },
        ),
    ]

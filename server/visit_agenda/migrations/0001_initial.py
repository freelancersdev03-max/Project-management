from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='VisitAgenda',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('visit_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='visit_agendas', to='clients.client')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='visit_agendas_created', to=settings.AUTH_USER_MODEL)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='visit_agendas_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-visit_date', '-updated_at'],
                'indexes': [models.Index(fields=['client', 'visit_date'], name='visit_agenda_client_5a1b4a_idx')],
            },
        ),
        migrations.CreateModel(
            name='VisitAgendaItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity', models.TextField(blank=True)),
                ('tentative_time', models.CharField(blank=True, max_length=64)),
                ('output', models.TextField(blank=True)),
                ('team_members', models.TextField(blank=True)),
                ('prior_tasks', models.TextField(blank=True)),
                ('order', models.PositiveIntegerField(default=1)),
                ('agenda', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='visit_agenda.visitagenda')),
                ('hqepl_rep', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='visit_agenda_items', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['order', 'id'],
            },
        ),
    ]

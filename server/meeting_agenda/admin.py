from django.contrib import admin

from .models import MeetingAgenda, MeetingAgendaItem, MeetingAgendaLog


class MeetingAgendaItemInline(admin.TabularInline):
    model = MeetingAgendaItem
    extra = 0


@admin.register(MeetingAgenda)
class MeetingAgendaAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'visit_date', 'created_by', 'updated_by', 'updated_at')
    list_filter = ('visit_date',)
    search_fields = ('client__company_name',)
    inlines = [MeetingAgendaItemInline]


@admin.register(MeetingAgendaLog)
class MeetingAgendaLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'visit_date', 'created_by', 'created_at')
    list_filter = ('visit_date',)
    search_fields = ('client__company_name',)

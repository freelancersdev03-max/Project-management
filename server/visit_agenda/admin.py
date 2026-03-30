from django.contrib import admin

from .models import VisitAgenda, VisitAgendaItem, VisitAgendaLog


class VisitAgendaItemInline(admin.TabularInline):
    model = VisitAgendaItem
    extra = 0


@admin.register(VisitAgenda)
class VisitAgendaAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'visit_date', 'created_by', 'updated_by', 'updated_at')
    list_filter = ('visit_date',)
    search_fields = ('client__company_name',)
    inlines = [VisitAgendaItemInline]


@admin.register(VisitAgendaLog)
class VisitAgendaLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'visit_date', 'created_by', 'created_at')
    list_filter = ('visit_date',)
    search_fields = ('client__company_name',)

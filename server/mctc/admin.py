from django.contrib import admin

from .models import MCTCEntry


@admin.register(MCTCEntry)
class MCTCEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'entry_date', 'entry_type', 'label', 'created_at')
    list_filter = ('entry_type', 'entry_date')
    search_fields = ('label', 'user__email', 'user__username')

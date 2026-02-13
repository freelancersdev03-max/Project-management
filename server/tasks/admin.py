from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    # What to show in the main admin table
    list_display = ('task_id', 'title', 'project', 'assigned_to', 'status', 'display_ats')
    
    # Filter options on the right sidebar for easy management
    list_filter = ('status', 'project', 'source_module')
    
    # Search configuration (Search by Task ID, User email, or Title)
    search_fields = ('task_id', 'title', 'assigned_to__email', 'assigned_by__email')
    
    # Organizing the detail page
    fieldsets = (
        ('Core Info', {
            'fields': ('task_id', 'title', 'description', 'source_module', 'source_ref_id')
        }),
        ('Project & Team', {
            'fields': ('project', 'client_org', 'assigned_to', 'assigned_by')
        }),
        ('Timeline', {
            'fields': ('start_date', 'target_date', 'completion_date', 'status')
        }),
        ('Files & Performance', {
            'fields': ('assigned_file', 'completion_file', 'remarks', 'ats_score')
        }),
    )
    
    readonly_fields = ('task_id', 'ats_score')

    def display_ats(self, obj):
        return f"{obj.ats_score}%"
    display_ats.short_description = 'ATS %'
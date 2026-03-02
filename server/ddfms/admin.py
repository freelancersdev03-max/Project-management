from django.contrib import admin

from .models import DDFMSPlan, DDFMSDeliverable, DDFMSStep


@admin.register(DDFMSPlan)
class DDFMSPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'month', 'year', 'created_by', 'updated_at')
    list_filter = ('month', 'year', 'client')
    search_fields = ('client__company_name',)


@admin.register(DDFMSDeliverable)
class DDFMSDeliverableAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan', 'title', 'source_type', 'source_id', 'target_date', 'order_index')
    list_filter = ('source_type', 'plan__month', 'plan__year')
    search_fields = ('title', 'plan__client__company_name')


@admin.register(DDFMSStep)
class DDFMSStepAdmin(admin.ModelAdmin):
    list_display = ('id', 'deliverable', 'step_number', 'responsible', 'target_date')
    list_filter = ('step_number',)
    search_fields = ('deliverable__title', 'responsible__username')

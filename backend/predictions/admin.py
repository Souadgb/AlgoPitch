from django.contrib import admin

from .models import Prediction


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ['user', 'ticker', 'direction', 'entry_price', 'target_price', 'deadline', 'status', 'created_at']
    list_filter = ['status', 'direction']
    search_fields = ['user__display_name', 'user__email', 'ticker__symbol']
    list_select_related = ['user', 'ticker']
    readonly_fields = ['created_at', 'resolved_at']
    date_hierarchy = 'created_at'

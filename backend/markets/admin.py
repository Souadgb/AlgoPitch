from django.contrib import admin

from .models import Ticker


@admin.register(Ticker)
class TickerAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'exchange', 'currency', 'asset_type', 'last_price', 'last_price_at']
    list_filter = ['asset_type', 'currency']
    search_fields = ['symbol', 'name']

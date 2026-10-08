from rest_framework import serializers

from .models import Ticker


class TickerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticker
        fields = ['symbol', 'name', 'exchange', 'currency', 'asset_type', 'last_price', 'last_price_at']


class TickerSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticker
        fields = ['symbol', 'name', 'currency']


class PopularTickerSerializer(TickerSerializer):
    open_predictions = serializers.IntegerField()
    total_predictions = serializers.IntegerField()

    class Meta(TickerSerializer.Meta):
        fields = TickerSerializer.Meta.fields + ['open_predictions', 'total_predictions']

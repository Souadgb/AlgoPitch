from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from markets.services import get_or_fetch_ticker, refresh_price

from .models import Prediction


def _pct(target: Decimal, reference: Decimal | None) -> float | None:
    if not reference:
        return None
    return float((target - reference) / reference * 100)


class PredictionSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    ticker = serializers.SerializerMethodField()
    target_change_pct = serializers.FloatField(read_only=True)
    remaining_change_pct = serializers.SerializerMethodField()

    class Meta:
        model = Prediction
        fields = [
            'id', 'user', 'ticker', 'direction', 'entry_price', 'target_price',
            'target_change_pct', 'remaining_change_pct', 'deadline', 'thesis',
            'status', 'hit_date', 'resolved_at', 'created_at',
        ]

    def get_user(self, obj):
        stats = self.context.get('member_stats', {}).get(obj.user_id)
        return {
            'id': obj.user_id,
            'display_name': obj.user.display_name,
            'avatar_color': obj.user.avatar_color,
            'stars': stats.stars if stats else None,
        }

    def get_ticker(self, obj):
        t = obj.ticker
        last_price = None if t.last_price is None else f'{t.last_price:f}'
        return {'symbol': t.symbol, 'name': t.name, 'currency': t.currency, 'last_price': last_price}

    def get_remaining_change_pct(self, obj):
        """Potentiel restant entre le cours actuel et la cible (prédictions en cours uniquement)."""
        if obj.status != Prediction.Status.OPEN:
            return None
        return _pct(obj.target_price, obj.ticker.last_price)


class PredictionCreateSerializer(serializers.Serializer):
    ticker = serializers.CharField(max_length=32)
    target_price = serializers.DecimalField(max_digits=20, decimal_places=6, min_value=Decimal('0.000001'))
    deadline = serializers.DateField()
    thesis = serializers.CharField(max_length=5000, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user = self.context['request'].user
        ticker = get_or_fetch_ticker(attrs['ticker'])
        if ticker is None:
            raise serializers.ValidationError({'ticker': 'Ticker introuvable.'})

        # Le cours de départ doit être frais : il sert de référence à l'écart minimum
        refresh_price(ticker, max_age_seconds=60)
        price = ticker.last_price
        if price is None:
            raise serializers.ValidationError({'ticker': 'Cours actuel indisponible, réessaie plus tard.'})

        today = timezone.localdate()
        min_days, max_days = settings.PREDICTION_MIN_HORIZON_DAYS, settings.PREDICTION_MAX_HORIZON_DAYS
        if not today + timedelta(days=min_days) <= attrs['deadline'] <= today + timedelta(days=max_days):
            raise serializers.ValidationError(
                {'deadline': f'La date limite doit être entre {min_days} jours et {max_days} jours à partir d’aujourd’hui.'}
            )

        min_gap = Decimal(str(settings.PREDICTION_MIN_TARGET_GAP))
        if abs(attrs['target_price'] - price) / price < min_gap:
            raise serializers.ValidationError(
                {'target_price': f'Le prix cible doit s’écarter d’au moins {min_gap * 100:.0f} % du cours actuel ({price:.2f}).'}
            )

        if Prediction.objects.filter(user=user, ticker=ticker, status=Prediction.Status.OPEN).exists():
            raise serializers.ValidationError('Tu as déjà une prédiction en cours sur ce ticker.')

        attrs['ticker'] = ticker
        attrs['entry_price'] = price
        attrs['direction'] = Prediction.Direction.UP if attrs['target_price'] > price else Prediction.Direction.DOWN
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return Prediction.objects.create(user=self.context['request'].user, **validated_data)
        except IntegrityError:
            raise serializers.ValidationError('Tu as déjà une prédiction en cours sur ce ticker.')

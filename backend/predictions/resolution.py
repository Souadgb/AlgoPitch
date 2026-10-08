"""Clôture des prédictions : succès si le cours touche la cible avant la date limite."""

from collections import defaultdict
from datetime import date, timedelta

from django.utils import timezone

from markets.providers import get_provider
from markets.providers.base import DailyBar

from .models import Prediction

Status = Prediction.Status


def evaluate(prediction: Prediction, bars: list[DailyBar], today: date) -> tuple[str, date | None] | None:
    """Retourne (statut, date de succès) si la prédiction peut être clôturée, sinon None.

    Seules les séances strictement postérieures au jour de publication comptent :
    sinon on pourrait publier une cible déjà touchée plus tôt dans la journée.
    """
    created = prediction.created_date
    for bar in sorted(bars, key=lambda b: b.date):
        if bar.date <= created or bar.date > prediction.deadline:
            continue
        if prediction.direction == Prediction.Direction.UP and bar.high >= prediction.target_price:
            return Status.SUCCESS, bar.date
        if prediction.direction == Prediction.Direction.DOWN and bar.low <= prediction.target_price:
            return Status.SUCCESS, bar.date
    if today > prediction.deadline:
        return Status.FAILED, None
    return None


def resolve_open_predictions(today: date | None = None) -> dict[str, int]:
    today = today or timezone.localdate()
    open_predictions = list(Prediction.objects.filter(status=Status.OPEN).select_related('ticker'))
    by_symbol: dict[str, list[Prediction]] = defaultdict(list)
    for prediction in open_predictions:
        by_symbol[prediction.ticker.symbol].append(prediction)

    counts = {'checked': len(open_predictions), 'success': 0, 'failed': 0, 'skipped': 0}
    if not open_predictions:
        return counts

    start = min(p.created_date for p in open_predictions) + timedelta(days=1)
    end = min(today, max(p.deadline for p in open_predictions))
    bars_by_symbol = get_provider().get_daily_bars(list(by_symbol), start, end) if start <= end else {}

    now = timezone.now()
    for symbol, predictions in by_symbol.items():
        bars = bars_by_symbol.get(symbol)
        for prediction in predictions:
            needs_data = prediction.created_date < min(today, prediction.deadline)
            if bars is None and needs_data:
                # Données indisponibles : on ne conclut rien, on réessaiera au prochain passage
                counts['skipped'] += 1
                continue
            outcome = evaluate(prediction, bars or [], today)
            if outcome is None:
                continue
            prediction.status, prediction.hit_date = outcome
            prediction.resolved_at = now
            prediction.save(update_fields=['status', 'hit_date', 'resolved_at'])
            counts[prediction.status] += 1
    return counts

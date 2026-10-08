import re
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Ticker
from .providers import get_provider

SYMBOL_RE = re.compile(r'^[A-Z0-9.\-=^]{1,32}$')


def normalize_symbol(raw: str) -> str | None:
    symbol = (raw or '').strip().upper()
    return symbol if SYMBOL_RE.match(symbol) else None


def get_or_fetch_ticker(raw_symbol: str) -> Ticker | None:
    """Retourne le ticker depuis la base, ou le crée à partir du fournisseur de données."""
    symbol = normalize_symbol(raw_symbol)
    if symbol is None:
        return None
    ticker = Ticker.objects.filter(symbol=symbol).first()
    if ticker:
        return ticker

    quote = get_provider().get_quote(symbol)
    if quote is None:
        return None
    ticker, _ = Ticker.objects.get_or_create(
        symbol=symbol,
        defaults={
            'name': quote.name[:200],
            'exchange': quote.exchange[:100],
            'currency': quote.currency[:10],
            'asset_type': quote.asset_type[:30],
            'last_price': quote.price,
            'last_price_at': timezone.now(),
        },
    )
    return ticker


def refresh_price(ticker: Ticker, max_age_seconds: int | None = None) -> Ticker:
    """Met à jour le dernier cours s'il est plus vieux que max_age_seconds."""
    if max_age_seconds is None:
        max_age_seconds = settings.QUOTE_CACHE_SECONDS
    now = timezone.now()
    if ticker.last_price_at and now - ticker.last_price_at < timedelta(seconds=max_age_seconds):
        return ticker
    price = get_provider().get_last_price(ticker.symbol)
    if price is not None:
        ticker.last_price = price
        ticker.last_price_at = now
        ticker.save(update_fields=['last_price', 'last_price_at'])
    return ticker

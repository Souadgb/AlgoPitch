import logging
import math
from datetime import date, timedelta
from decimal import Decimal

import pandas as pd
import yfinance as yf

from .base import DailyBar, PriceProvider, Quote, SearchResult

logger = logging.getLogger(__name__)


def _to_decimal(value) -> Decimal | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or number <= 0:
        return None
    return Decimal(str(round(number, 6)))


class YFinanceProvider(PriceProvider):
    def search(self, query, limit=8):
        try:
            quotes = yf.Search(query, max_results=limit, news_count=0).quotes
        except Exception:
            logger.exception('Recherche yfinance échouée pour %r', query)
            return []
        results = []
        for q in quotes:
            symbol = q.get('symbol')
            if not symbol:
                continue
            results.append(
                SearchResult(
                    symbol=symbol.upper(),
                    name=q.get('longname') or q.get('shortname') or symbol,
                    exchange=q.get('exchDisp') or q.get('exchange') or '',
                    asset_type=(q.get('quoteType') or '').lower(),
                )
            )
        return results

    def get_quote(self, symbol):
        ticker = yf.Ticker(symbol)
        try:
            fast = ticker.fast_info
            price = _to_decimal(fast['lastPrice'])
            currency = fast['currency'] or ''
            exchange = fast['exchange'] or ''
            asset_type = (fast['quoteType'] or '').lower()
        except Exception:
            logger.info('Symbole introuvable sur yfinance : %s', symbol)
            return None
        if price is None:
            return None

        name = symbol
        try:
            info = ticker.info
            name = info.get('longName') or info.get('shortName') or symbol
            exchange = info.get('fullExchangeName') or exchange
        except Exception:
            logger.warning('Métadonnées yfinance indisponibles pour %s', symbol)

        return Quote(
            symbol=symbol,
            name=name,
            exchange=exchange,
            currency=currency,  # garder 'GBp' (pence) distinct de 'GBP'
            asset_type=asset_type,
            price=price,
        )

    def get_last_price(self, symbol):
        try:
            return _to_decimal(yf.Ticker(symbol).fast_info['lastPrice'])
        except Exception:
            logger.warning('Cours yfinance indisponible pour %s', symbol)
            return None

    def get_daily_bars(self, symbols, start, end):
        if not symbols or start > end:
            return {}
        try:
            df = yf.download(
                symbols,
                start=start.isoformat(),
                end=(end + timedelta(days=1)).isoformat(),  # borne de fin exclusive chez yfinance
                interval='1d',
                group_by='ticker',
                auto_adjust=False,
                progress=False,
            )
        except Exception:
            logger.exception('Téléchargement yfinance échoué pour %s', symbols)
            return {}
        if df is None or df.empty:
            return {}

        bars: dict[str, list[DailyBar]] = {}
        for symbol in symbols:
            try:
                sub = df[symbol] if isinstance(df.columns, pd.MultiIndex) else df
            except KeyError:
                continue
            sub = sub[['High', 'Low']].dropna()
            rows = []
            for index, row in sub.iterrows():
                high, low = _to_decimal(row['High']), _to_decimal(row['Low'])
                if high is None or low is None:
                    continue
                day: date = index.date()
                if start <= day <= end:
                    rows.append(DailyBar(date=day, high=high, low=low))
            # Aucune ligne valide = données manquantes, pas « aucune séance »
            if rows:
                bars[symbol] = rows
        return bars

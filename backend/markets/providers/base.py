"""Interface commune aux fournisseurs de données de marché (yfinance aujourd'hui, FMP demain)."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass(frozen=True)
class SearchResult:
    symbol: str
    name: str
    exchange: str
    asset_type: str


@dataclass(frozen=True)
class Quote:
    symbol: str
    name: str
    exchange: str
    currency: str
    asset_type: str
    price: Decimal


@dataclass(frozen=True)
class DailyBar:
    date: date
    high: Decimal
    low: Decimal


class PriceProvider(ABC):
    @abstractmethod
    def search(self, query: str, limit: int = 8) -> list[SearchResult]:
        """Recherche de tickers par symbole ou nom."""

    @abstractmethod
    def get_quote(self, symbol: str) -> Quote | None:
        """Métadonnées + dernier cours. None si le symbole est inconnu."""

    @abstractmethod
    def get_last_price(self, symbol: str) -> Decimal | None:
        """Dernier cours uniquement (appel léger)."""

    @abstractmethod
    def get_daily_bars(self, symbols: list[str], start: date, end: date) -> dict[str, list[DailyBar]]:
        """Plus hauts / plus bas quotidiens entre start et end inclus.

        Un symbole absent du résultat signifie que les données n'ont pas pu être
        récupérées : l'appelant ne doit alors tirer aucune conclusion.
        """

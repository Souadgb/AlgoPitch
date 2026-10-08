from dataclasses import asdict

from django.core.cache import cache
from django.db.models import Count, Q
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ticker
from .providers import get_provider
from .serializers import PopularTickerSerializer, TickerSerializer
from .services import get_or_fetch_ticker, refresh_price


class TickerSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 1 or len(query) > 50:
            return Response([])
        key = f'ticker-search:{query.lower()}'
        results = cache.get(key)
        if results is None:
            results = [asdict(r) for r in get_provider().search(query)]
            cache.set(key, results, 60 * 10)
        return Response(results)


class PopularTickersView(APIView):
    """Tickers ayant au moins une prédiction, les plus actifs d'abord."""

    permission_classes = [AllowAny]

    def get(self, request):
        tickers = (
            Ticker.objects.annotate(
                total_predictions=Count('predictions'),
                open_predictions=Count('predictions', filter=Q(predictions__status='open')),
            )
            .filter(total_predictions__gt=0)
            .order_by('-open_predictions', '-total_predictions', 'symbol')[:12]
        )
        return Response(PopularTickerSerializer(tickers, many=True).data)


class TickerDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, symbol):
        ticker = get_or_fetch_ticker(symbol)
        if ticker is None:
            raise NotFound('Ticker introuvable.')
        refresh_price(ticker)
        return Response(TickerSerializer(ticker).data)

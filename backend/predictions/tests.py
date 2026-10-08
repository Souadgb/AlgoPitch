from datetime import date, datetime, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from markets.models import Ticker
from markets.providers.base import DailyBar, PriceProvider, Quote

from .models import Prediction
from .ranking import compute_member_stats, percentile_stars, wilson_lower_bound
from .resolution import evaluate, resolve_open_predictions

D = Decimal


class FakeProvider(PriceProvider):
    prices: dict[str, Decimal] = {'NVDA': D('200'), 'BTC-USD': D('80000')}
    bars: dict[str, list[DailyBar]] = {}

    def search(self, query, limit=8):
        return []

    def get_quote(self, symbol):
        if symbol not in self.prices:
            return None
        return Quote(symbol, f'{symbol} Inc.', 'NASDAQ', 'USD', 'equity', self.prices[symbol])

    def get_last_price(self, symbol):
        return self.prices.get(symbol)

    def get_daily_bars(self, symbols, start, end):
        return {s: [b for b in self.bars[s] if start <= b.date <= end] for s in symbols if s in self.bars}


FAKE = override_settings(PRICE_PROVIDER='predictions.tests.FakeProvider')


def make_user(name, verified=True):
    return User.objects.create_user(
        email=f'{name.lower()}@ens.etsmtl.ca', password='MotDePasse-Solide-42',
        display_name=name, email_verified=verified,
    )


def make_prediction(user, ticker, target, deadline, created, status=Prediction.Status.OPEN, entry=D('100')):
    p = Prediction.objects.create(
        user=user, ticker=ticker, entry_price=entry, target_price=D(target), deadline=deadline, status=status,
        direction=Prediction.Direction.UP if D(target) > entry else Prediction.Direction.DOWN,
    )
    created_at = timezone.make_aware(datetime.combine(created, datetime.min.time().replace(hour=12)))
    Prediction.objects.filter(pk=p.pk).update(created_at=created_at)
    p.refresh_from_db()
    return p


class WilsonAndStarsTests(TestCase):
    def test_small_samples_are_penalised(self):
        self.assertGreater(wilson_lower_bound(19, 20), wilson_lower_bound(1, 1))
        self.assertGreater(wilson_lower_bound(20, 25), wilson_lower_bound(4, 4))
        self.assertEqual(wilson_lower_bound(0, 0), 0.0)

    def test_percentile_stars(self):
        self.assertEqual(percentile_stars([0.8]), [5.0])
        self.assertEqual(percentile_stars([0.9, 0.5, 0.1]), [5.0, 2.5, 0.5])
        self.assertEqual(percentile_stars([0.5, 0.5]), [0.5, 0.5])


class EvaluateTests(TestCase):
    def setUp(self):
        self.user = make_user('Alice')
        self.ticker = Ticker.objects.create(symbol='NVDA', last_price=D('100'))
        self.created = date(2026, 9, 1)
        self.deadline = date(2026, 9, 30)

    def bar(self, day, high, low):
        return DailyBar(date(2026, 9, day), D(high), D(low))

    def test_up_target_touched_by_intraday_high(self):
        p = make_prediction(self.user, self.ticker, '110', self.deadline, self.created)
        bars = [self.bar(2, 105, 99), self.bar(3, 110.5, 104), self.bar(4, 120, 110)]
        self.assertEqual(evaluate(p, bars, date(2026, 9, 10)), ('success', date(2026, 9, 3)))

    def test_down_target_touched_by_intraday_low(self):
        p = make_prediction(self.user, self.ticker, '90', self.deadline, self.created)
        bars = [self.bar(2, 101, 95), self.bar(5, 96, 89.9)]
        self.assertEqual(evaluate(p, bars, date(2026, 9, 10)), ('success', date(2026, 9, 5)))

    def test_creation_day_is_ignored(self):
        p = make_prediction(self.user, self.ticker, '110', self.deadline, self.created)
        self.assertIsNone(evaluate(p, [self.bar(1, 115, 100)], date(2026, 9, 10)))

    def test_bars_after_deadline_are_ignored(self):
        p = make_prediction(self.user, self.ticker, '110', date(2026, 9, 15), self.created)
        result = evaluate(p, [self.bar(16, 130, 100)], date(2026, 9, 20))
        self.assertEqual(result, ('failed', None))

    def test_open_until_deadline_passes(self):
        p = make_prediction(self.user, self.ticker, '110', self.deadline, self.created)
        bars = [self.bar(2, 105, 99)]
        self.assertIsNone(evaluate(p, bars, self.deadline))
        self.assertEqual(evaluate(p, bars, self.deadline + timedelta(days=1)), ('failed', None))


@FAKE
class ResolveCommandTests(TestCase):
    def setUp(self):
        self.user = make_user('Alice')
        self.nvda = Ticker.objects.create(symbol='NVDA', last_price=D('100'))
        self.btc = Ticker.objects.create(symbol='BTC-USD', last_price=D('100'))

    def test_resolves_success_and_skips_missing_data(self):
        FakeProvider.bars = {'NVDA': [DailyBar(date(2026, 9, 3), D('111'), D('100'))]}
        win = make_prediction(self.user, self.nvda, '110', date(2026, 9, 30), date(2026, 9, 1))
        missing = make_prediction(self.user, self.btc, '110', date(2026, 9, 10), date(2026, 9, 1))

        counts = resolve_open_predictions(today=date(2026, 9, 20))

        win.refresh_from_db()
        missing.refresh_from_db()
        self.assertEqual(win.status, 'success')
        self.assertEqual(win.hit_date, date(2026, 9, 3))
        # Pas de données pour BTC-USD : on ne la déclare pas échouée
        self.assertEqual(missing.status, 'open')
        self.assertEqual(counts['skipped'], 1)


class RankingTests(TestCase):
    def test_ranking_uses_wilson_then_volume(self):
        ticker = Ticker.objects.create(symbol='NVDA', last_price=D('100'))
        lucky, steady, big = make_user('Lucky'), make_user('Steady'), make_user('Big')
        day, deadline = date(2026, 1, 1), date(2026, 2, 1)
        S = Prediction.Status

        make_prediction(lucky, ticker, '110', deadline, day, status=S.SUCCESS)  # 1/1
        for i in range(10):  # 9/10
            make_prediction(steady, ticker, '110', deadline, day, status=S.SUCCESS if i < 9 else S.FAILED)
        for i in range(20):  # 18/20 : même taux, plus de volume
            make_prediction(big, ticker, '110', deadline, day, status=S.SUCCESS if i < 18 else S.FAILED)

        stats = compute_member_stats()
        self.assertEqual(
            [stats[u.pk].rank for u in (big, steady, lucky)], [1, 2, 3],
        )
        self.assertEqual(stats[big.pk].stars, 5.0)
        self.assertEqual(stats[lucky.pk].stars, 0.5)


@FAKE
class CreatePredictionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user('Alice')
        self.client.force_authenticate(self.user)
        self.today = timezone.localdate()

    def post(self, **overrides):
        payload = {
            'ticker': 'nvda',
            'target_price': '230',
            'deadline': (self.today + timedelta(days=30)).isoformat(),
            'thesis': 'Croissance des data centers.',
            **overrides,
        }
        return self.client.post('/api/predictions/', payload, format='json')

    def test_creates_prediction_with_entry_price_and_direction(self):
        response = self.post()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['direction'], 'up')
        self.assertEqual(D(response.data['entry_price']), D('200'))
        self.assertAlmostEqual(response.data['target_change_pct'], 15.0)

        down = self.post(ticker='BTC-USD', target_price='70000')
        self.assertEqual(down.data['direction'], 'down')

    def test_rejects_target_too_close(self):
        response = self.post(target_price='205')
        self.assertEqual(response.status_code, 400)
        self.assertIn('target_price', response.data)

    def test_rejects_deadline_out_of_bounds(self):
        too_soon = self.post(deadline=(self.today + timedelta(days=6)).isoformat())
        too_far = self.post(deadline=(self.today + timedelta(days=366)).isoformat())
        self.assertIn('deadline', too_soon.data)
        self.assertIn('deadline', too_far.data)

    def test_rejects_unknown_ticker(self):
        self.assertIn('ticker', self.post(ticker='ZZZZ').data)

    def test_one_open_prediction_per_ticker(self):
        self.assertEqual(self.post().status_code, 201)
        second = self.post(target_price='250')
        self.assertEqual(second.status_code, 400)

    def test_cannot_update_or_delete(self):
        pk = self.post().data['id']
        self.assertEqual(self.client.delete(f'/api/predictions/{pk}/').status_code, 405)
        self.assertEqual(self.client.patch(f'/api/predictions/{pk}/', {'target_price': '300'}).status_code, 405)

    def test_anonymous_cannot_create(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.post().status_code, 403)

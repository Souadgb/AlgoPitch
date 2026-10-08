"""Données de démonstration pour le développement local (membres fictifs + prédictions)."""

import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import User
from markets.services import get_or_fetch_ticker

from ...models import Prediction

PASSWORD = 'demo-AlgoPitch-2026'
MEMBERS = [
    # pseudo, nombre de prédictions clôturées, taux de succès visé
    ('Camille', 25, 0.84),
    ('Hugo', 23, 0.52),
    ('Léa', 18, 0.55),
    ('Mathis', 12, 0.33),
    ('Inès', 4, 1.0),
    ('Noah', 0, 0.0),
]
SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AIR.PA', 'MC.PA', 'SHOP.TO', 'BTC-USD', 'ETH-USD', 'SPY']
THESES = [
    "Les résultats trimestriels devraient surprendre à la hausse grâce à la demande en data centers.",
    "Valorisation tendue après le rallye, je m'attends à une consolidation vers le support.",
    "Catalyseur : journée investisseurs le mois prochain, guidance probablement relevée.",
    "Marges sous pression avec la hausse des coûts, le marché n'a pas encore intégré le risque.",
    '',
]


class Command(BaseCommand):
    help = 'Crée des membres et prédictions fictifs (développement uniquement).'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Supprime d’abord les membres de démo.')

    def handle(self, *args, reset=False, **options):
        if not settings.DEBUG:
            raise CommandError('Commande réservée au développement (DEBUG=True).')
        rng = random.Random(42)
        if reset:
            User.objects.filter(email__startswith='demo.').delete()

        tickers = [t for t in (get_or_fetch_ticker(s) for s in SYMBOLS) if t and t.last_price]
        if not tickers:
            raise CommandError('Impossible de récupérer les tickers (connexion à yfinance ?).')

        today = timezone.localdate()
        for name, closed, rate in MEMBERS:
            email = f'demo.{name.lower().replace("é", "e").replace("è", "e")}@{settings.ALLOWED_EMAIL_DOMAIN}'
            user, created = User.objects.get_or_create(
                email=email, defaults={'display_name': name, 'email_verified': True}
            )
            if not created:
                continue
            user.set_password(PASSWORD)
            user.save()

            successes = round(closed * rate)
            for i in range(closed):
                ticker = rng.choice(tickers)
                start = today - timedelta(days=rng.randint(60, 400))
                deadline = start + timedelta(days=rng.randint(30, 180))
                deadline = min(deadline, today - timedelta(days=1))
                success = i < successes
                self._create(user, ticker, rng, start, deadline,
                             Prediction.Status.SUCCESS if success else Prediction.Status.FAILED,
                             hit=start + timedelta(days=rng.randint(8, max(8, (deadline - start).days))) if success else None)

            # Une ou deux prédictions en cours, sur des tickers distincts
            for ticker in rng.sample(tickers, k=min(len(tickers), rng.randint(1, 3))):
                start = today - timedelta(days=rng.randint(1, 20))
                self._create(user, ticker, rng, start, today + timedelta(days=rng.randint(20, 200)), Prediction.Status.OPEN)

        self.stdout.write(self.style.SUCCESS(
            f'Données de démo créées. Connexion possible avec demo.camille@{settings.ALLOWED_EMAIL_DOMAIN} / {PASSWORD}'
        ))

    def _create(self, user, ticker, rng, start, deadline, status, hit=None):
        entry = ticker.last_price * Decimal(str(rng.uniform(0.8, 1.2)))
        move = Decimal(str(rng.choice([-1, 1, 1]) * rng.uniform(0.06, 0.35)))
        prediction = Prediction.objects.create(
            user=user, ticker=ticker, entry_price=entry.quantize(Decimal('0.01')),
            target_price=(entry * (1 + move)).quantize(Decimal('0.01')), deadline=deadline,
            direction=Prediction.Direction.UP if move > 0 else Prediction.Direction.DOWN,
            thesis=rng.choice(THESES), status=status, hit_date=hit,
            resolved_at=timezone.now() if status != Prediction.Status.OPEN else None,
        )
        created_at = timezone.make_aware(datetime.combine(start, datetime.min.time()).replace(hour=rng.randint(9, 20)))
        Prediction.objects.filter(pk=prediction.pk).update(created_at=created_at)

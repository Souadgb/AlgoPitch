from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Prediction(models.Model):
    class Direction(models.TextChoices):
        UP = 'up', 'Hausse'
        DOWN = 'down', 'Baisse'

    class Status(models.TextChoices):
        OPEN = 'open', 'En cours'
        SUCCESS = 'success', 'Réussie'
        FAILED = 'failed', 'Échouée'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='predictions')
    ticker = models.ForeignKey('markets.Ticker', on_delete=models.PROTECT, related_name='predictions')
    direction = models.CharField('sens', max_length=4, choices=Direction.choices)
    entry_price = models.DecimalField('cours de départ', max_digits=20, decimal_places=6)
    target_price = models.DecimalField('prix cible', max_digits=20, decimal_places=6)
    deadline = models.DateField('date limite')
    thesis = models.TextField('thèse', blank=True)
    status = models.CharField('statut', max_length=8, choices=Status.choices, default=Status.OPEN, db_index=True)
    hit_date = models.DateField('cible atteinte le', null=True, blank=True)
    resolved_at = models.DateTimeField('clôturée le', null=True, blank=True)
    created_at = models.DateTimeField('créée le', auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'ticker'],
                condition=Q(status='open'),
                name='one_open_prediction_per_user_ticker',
            ),
        ]

    def __str__(self):
        return f'{self.user} — {self.ticker} → {self.target_price} avant le {self.deadline}'

    @property
    def created_date(self):
        return timezone.localtime(self.created_at).date()

    @property
    def target_change_pct(self):
        """Variation visée par rapport au cours de départ, en %."""
        return float((self.target_price - self.entry_price) / self.entry_price * 100)

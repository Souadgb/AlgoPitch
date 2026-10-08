from django.db import models


class Ticker(models.Model):
    symbol = models.CharField('symbole', max_length=32, unique=True)
    name = models.CharField('nom', max_length=200, blank=True)
    exchange = models.CharField('place de cotation', max_length=100, blank=True)
    currency = models.CharField('devise', max_length=10, blank=True)
    asset_type = models.CharField("type d'actif", max_length=30, blank=True)
    last_price = models.DecimalField('dernier cours', max_digits=20, decimal_places=6, null=True, blank=True)
    last_price_at = models.DateTimeField('mis à jour le', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['symbol']

    def __str__(self):
        return self.symbol

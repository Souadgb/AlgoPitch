from functools import cache

from django.conf import settings
from django.utils.module_loading import import_string

from .base import PriceProvider


@cache
def _load(path: str) -> PriceProvider:
    return import_string(path)()


def get_provider() -> PriceProvider:
    return _load(settings.PRICE_PROVIDER)

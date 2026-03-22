import time

_cached_rates = {}
_last_fetch_time = 0
CACHE_TTL_SECONDS = 86400


def get_exchange_rates() -> dict[str, float]:
    global _cached_rates, _last_fetch_time

    if time.time() - _last_fetch_time > CACHE_TTL_SECONDS or not _cached_rates:
        # TODO: replace with actuall call later
        _cached_rates = {"EUR": 1.0, "USD": 0.92, "GBP": 1.17, "CZK": 0.04}
        _last_fetch_time = time.time()

    return _cached_rates

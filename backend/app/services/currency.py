import threading
import time

_lock = threading.Lock()
_cached_rates: dict[str, float] = {}
_last_fetch_time: float = 0
CACHE_TTL_SECONDS = 86400


def get_exchange_rates() -> dict[str, float]:
    global _cached_rates, _last_fetch_time

    with _lock:
        if time.time() - _last_fetch_time > CACHE_TTL_SECONDS or not _cached_rates:
            # TODO: replace with actual API call
            _cached_rates = {"EUR": 1.0, "USD": 0.92, "GBP": 1.17, "CZK": 0.04}
            _last_fetch_time = time.time()

        return _cached_rates

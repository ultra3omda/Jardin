"""HTTP layer: persistent session, rate limiting, retry, login-redirect detection."""
import time

from scrapling.fetchers import FetcherSession

import config

_LOGIN_MARKERS = ("name=login", "identifiant", "se connecter", "mot de passe")


def build_session() -> FetcherSession:
    return FetcherSession(timeout=config.REQUEST_TIMEOUT_SECONDS)


def looks_like_login(html: str) -> bool:
    low = html.lower()
    return any(marker in low for marker in _LOGIN_MARKERS)


def get(session: FetcherSession, url: str):
    """GET with rate-limit + retry. Returns a scrapling Selector/response."""
    last_exc = None
    for attempt in range(config.MAX_RETRIES):
        try:
            time.sleep(config.REQUEST_DELAY_SECONDS)
            return session.get(url)
        except Exception as exc:  # network-level, retried
            last_exc = exc
            time.sleep(config.REQUEST_DELAY_SECONDS * (attempt + 1))
    raise last_exc

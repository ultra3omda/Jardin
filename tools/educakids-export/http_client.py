"""HTTP layer: persistent session factory, rate limiting, retry, login detection."""
import time

from scrapling.fetchers import FetcherSession

import config


def build_session() -> FetcherSession:
    """Return a FetcherSession context manager. Use as: `with build_session() as s:`."""
    return FetcherSession(timeout=config.REQUEST_TIMEOUT_SECONDS)


def looks_like_login(html: str) -> bool:
    """True only when the page is the actual login form (both markers co-occur)."""
    low = html.lower()
    return "mot de passe" in low and "se connecter" in low


def response_body(resp) -> str:
    """Best-effort text body from a scrapling Response."""
    return getattr(resp, "html_content", "") or getattr(resp, "body", "") or str(resp)


def get(session, url: str):
    """GET with rate-limit + retry. `session` is the object yielded by `with build_session()`."""
    last_exc = None
    for attempt in range(config.MAX_RETRIES):
        try:
            time.sleep(config.REQUEST_DELAY_SECONDS)
            return session.get(url)
        except Exception as exc:
            last_exc = exc
            time.sleep(config.REQUEST_DELAY_SECONDS * (attempt + 1))
    raise last_exc

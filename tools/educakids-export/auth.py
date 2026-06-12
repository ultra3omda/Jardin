"""Authentication: login POST + credential guard."""
from urllib.parse import urljoin

import config
import http_client


def assert_credentials() -> None:
    if not config.IDENTIFIANT or not config.PASSWORD:
        raise RuntimeError(
            "Missing credentials. Fill EDUCAKIDS_IDENTIFIANT / EDUCAKIDS_PASSWORD in .env."
        )


def build_login_payload() -> dict:
    return {
        config.LOGIN_FIELD_USER: config.IDENTIFIANT,
        config.LOGIN_FIELD_PASS: config.PASSWORD,
    }


def login(session) -> None:
    """POST credentials; raises if the result still looks like the login page."""
    assert_credentials()
    login_url = urljoin(config.BASE_URL, config.LOGIN_PATH)
    resp = session.post(login_url, data=build_login_payload())
    body = getattr(resp, "html_content", "") or getattr(resp, "body", "") or str(resp)
    if http_client.looks_like_login(body):
        raise RuntimeError("Login failed — still on login page. Check credentials/field names.")

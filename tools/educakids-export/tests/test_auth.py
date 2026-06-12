import auth


def test_build_login_payload_uses_config(monkeypatch):
    monkeypatch.setattr(auth.config, "LOGIN_FIELD_USER", "identifiant")
    monkeypatch.setattr(auth.config, "LOGIN_FIELD_PASS", "password")
    monkeypatch.setattr(auth.config, "IDENTIFIANT", "user1")
    monkeypatch.setattr(auth.config, "PASSWORD", "secret")
    payload = auth.build_login_payload()
    assert payload == {"identifiant": "user1", "password": "secret"}


def test_login_raises_without_credentials(monkeypatch):
    monkeypatch.setattr(auth.config, "IDENTIFIANT", "")
    monkeypatch.setattr(auth.config, "PASSWORD", "")
    try:
        auth.assert_credentials()
        assert False, "expected error"
    except RuntimeError as exc:
        assert "credentials" in str(exc).lower()

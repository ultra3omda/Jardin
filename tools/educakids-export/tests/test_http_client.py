import http_client


def test_looks_like_login_true_on_real_login_page():
    html = "<form action='/login'>Mot de passe <button>Se connecter</button></form>"
    assert http_client.looks_like_login(html) is True


def test_looks_like_login_false_on_dashboard():
    assert http_client.looks_like_login("<a href='/logout'>Déconnexion</a> students table") is False

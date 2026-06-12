import http_client


class FakeSelector:
    def __init__(self, status, url):
        self.status = status
        self.url = url


def test_looks_like_login_redirect_true():
    assert http_client.looks_like_login("<form name=login>identifiant</form>") is True


def test_looks_like_login_redirect_false():
    assert http_client.looks_like_login("<table>students</table>") is False

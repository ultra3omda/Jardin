from pathlib import Path
from scrapling.parser import Selector
import discover

FIXTURE = Path(__file__).parent / "fixtures" / "nav.html"


def test_extract_forms_captures_action_method_and_fields():
    html = (
        "<form action='/login' method='post'>"
        "<input name='username'><input name='password'>"
        "<select name='role'></select><textarea name='note'></textarea>"
        "</form>"
    )
    forms = discover.extract_forms(Selector(html))
    assert forms == [
        {"action": "/login", "method": "post",
         "fields": ["username", "password", "role", "note"]}
    ]


def test_extract_internal_links_keeps_same_host_only():
    sel = Selector(FIXTURE.read_text(encoding="utf-8"))
    links = discover.extract_internal_links(sel, base_url="https://admin.educakids.tn")
    assert "https://admin.educakids.tn/eleves" in links
    assert "https://admin.educakids.tn/classes" in links
    assert all("external.example" not in u for u in links)
    assert all(not u.endswith("#") for u in links)


def test_extract_internal_links_skips_dangerous_and_nonhttp():
    sel = Selector(FIXTURE.read_text(encoding="utf-8"))
    links = discover.extract_internal_links(sel, base_url="https://admin.educakids.tn")
    assert all("logout" not in u.lower() for u in links)
    assert all("supprimer" not in u.lower() for u in links)
    assert all(not u.startswith("mailto:") for u in links)


def test_is_dangerous_link_detects_destructive_paths():
    assert discover.is_dangerous_link("/eleves/3/supprimer") is True
    assert discover.is_dangerous_link("/logout") is True
    assert discover.is_dangerous_link("/eleves/3") is False

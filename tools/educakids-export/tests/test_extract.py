from pathlib import Path
from scrapling.parser import Selector
import extract

FX = Path(__file__).parent / "fixtures"


def test_extract_list_rows_returns_detail_links():
    sel = Selector((FX / "list_page.html").read_text(encoding="utf-8"))
    spec = extract.ModuleSpec(
        name="eleves",
        row_selector="tr.row a::attr(href)",
        next_selector="a.next::attr(href)",
        fields={"nom": "#nom::text", "date": "#date::text"},
    )
    links = extract.extract_list_links(sel, spec)
    assert links == ["/eleves/1", "/eleves/2"]


def test_extract_detail_fields_maps_selectors():
    sel = Selector((FX / "detail_page.html").read_text(encoding="utf-8"))
    spec = extract.ModuleSpec(
        name="eleves", row_selector="", next_selector="",
        fields={"nom": "#nom::text", "date": "#date::text"},
    )
    rec = extract.extract_detail(sel, spec, source_url="/eleves/1")
    assert rec["nom"] == "Alpha"
    assert rec["date"] == "2020-01-01"
    assert rec["_source_url"] == "/eleves/1"


def test_find_next_page_returns_none_when_absent():
    sel = Selector("<html><body>no next</body></html>")
    spec = extract.ModuleSpec(name="x", row_selector="", next_selector="a.next::attr(href)", fields={})
    assert extract.find_next_page(sel, spec) is None

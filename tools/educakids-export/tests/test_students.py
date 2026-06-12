from pathlib import Path
from scrapling.parser import Selector
import students

FX = Path(__file__).parent / "fixtures"


def test_get_class_options_skips_placeholder():
    page = Selector((FX / "student_page.html").read_text(encoding="utf-8"))
    classes = students.get_class_options(page)
    assert {"id": "710", "label": "3ans-Les poussins"} in classes
    assert all(c["id"] not in ("0", "") for c in classes)
    assert len(classes) == 2


def test_extract_students_from_class_parses_rows_and_id():
    page = Selector((FX / "student_class.html").read_text(encoding="utf-8"))
    recs = students.extract_students_from_class(page, "710", "3ans-Les poussins")
    assert len(recs) == 2
    assert recs[0]["student_id"] == "8808"
    assert recs[0]["class_id"] == "710"
    assert recs[0]["class_label"] == "3ans-Les poussins"
    assert "ben jaballah Elyana" in recs[0]["cells"]


def test_extract_students_skips_header_only_rows():
    page = Selector("<table><tr><th>Nom</th></tr></table>")
    assert students.extract_students_from_class(page, "1", "x") == []

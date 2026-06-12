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


def test_extract_students_from_class_parses_clean_record():
    page = Selector((FX / "student_class.html").read_text(encoding="utf-8"))
    recs = students.extract_students_from_class(page, "710", "3ans-Les poussins")
    assert len(recs) == 2
    r = recs[0]
    assert r["student_id"] == "8808"
    assert r["class_id"] == "710"
    assert r["name"] == "ben jaballah Elyana"
    assert r["admission_number"] == "8808"
    assert r["code"] == "smi-8808"
    assert r["birth_date"] == "2022-10-18"
    assert r["phone"] == "51456844"


def test_to_record_handles_short_rows():
    rec = students.to_record(["0", "Solo"], "1", "x", None)
    assert rec["name"] == "Solo"
    assert rec["phone"] == ""


def test_extract_students_skips_header_only_rows():
    page = Selector("<table><tr><th>Nom</th></tr></table>")
    assert students.extract_students_from_class(page, "1", "x") == []

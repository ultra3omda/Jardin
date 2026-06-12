"""Extract the full student roster, class by class, via the searchstd endpoint."""
import re
from urllib.parse import urljoin

import config
import http_client

# NOTE: genre=0 ("all genders") is REQUIRED. An empty genre= filters out every
# row (the legacy server treats "" as a non-matching filter). With genre=0 the
# endpoint returns the full class roster deterministically.
_SEARCH = "/searchstd?nom=&prenom=&age=&numad=&genre=0&groupe={gid}"
_STUDENTID_RE = re.compile(r"studentid=(\d+)", re.I)

# Live searchstd row layout (9 <td> cells). Indices are stable across all classes.
STUDENT_CELL_INDEX = {
    "name": 1,
    "admission_number": 2,
    "code": 4,
    "birth_date": 5,
    "phone": 6,
}


def to_record(cells: list[str], class_id: str, class_label: str, student_id) -> dict:
    """Map raw <td> cell texts to a clean student record."""
    def cell(i: int) -> str:
        return cells[i] if len(cells) > i else ""
    rec = {"class_id": class_id, "class_label": class_label, "student_id": student_id}
    for field, idx in STUDENT_CELL_INDEX.items():
        rec[field] = cell(idx)
    return rec


def get_class_options(student_page) -> list[dict]:
    """Return [{'id': '710', 'label': '...'}] for each real class (skip placeholder)."""
    classes: list[dict] = []
    for select in student_page.css("select"):
        names = select.css("::attr(name)")
        if not names or str(names[0]) != "groupe":
            continue
        for opt in select.css("option"):
            val = opt.css("::attr(value)")
            val = str(val[0]).strip() if val else ""
            if not val or val in ("0",):
                continue
            txt = opt.css("::text")
            label = " ".join(str(txt[0]).split()) if txt else ""
            classes.append({"id": val, "label": label})
    return classes


def extract_students_from_class(class_page, class_id: str, class_label: str) -> list[dict]:
    """Parse one searchstd result page into student dicts."""
    records: list[dict] = []
    rows = class_page.css("table tr")
    for row in rows:
        tds = row.css("td")
        if not tds:
            continue  # header row (th) or empty
        cells = [
            " ".join(" ".join(str(t).split()) for t in td.css("::text")).strip()
            for td in tds
        ]
        if not any(cells):
            continue  # all-empty row
        # student id from any link in the row
        sid = None
        for href in row.css("a::attr(href)"):
            m = _STUDENTID_RE.search(str(href))
            if m:
                sid = m.group(1)
                break
        records.append(to_record(cells, class_id, class_label, sid))
    return records


def extract_all_students(session) -> list[dict]:
    """Fetch /student, then every class roster; return all students."""
    page = http_client.get(session, urljoin(config.BASE_URL, "/student"))
    classes = get_class_options(page)
    all_students: list[dict] = []
    for cls in classes:
        url = urljoin(config.BASE_URL, _SEARCH.format(gid=cls["id"]))
        try:
            class_page = http_client.get(session, url)
        except Exception:
            continue
        all_students.extend(
            extract_students_from_class(class_page, cls["id"], cls["label"])
        )
    return all_students

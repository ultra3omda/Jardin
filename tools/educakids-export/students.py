"""Extract the full student roster, class by class, via the searchstd endpoint."""
import re
from urllib.parse import urljoin

import config
import http_client

_SEARCH = "/searchstd?groupe={gid}&nom=&prenom=&age=&numad=&genre="
_STUDENTID_RE = re.compile(r"studentid=(\d+)", re.I)


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
        cells = [str(c).strip() for c in row.css("td::text") if str(c).strip()]
        if not cells:
            continue  # header row (th) or empty
        # student id from any link in the row
        sid = None
        for href in row.css("a::attr(href)"):
            m = _STUDENTID_RE.search(str(href))
            if m:
                sid = m.group(1)
                break
        records.append({
            "student_id": sid,
            "class_id": class_id,
            "class_label": class_label,
            "cells": cells,
        })
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

"""Re-scrape student GENRE from EducaKids using stdlib only (no scrapling/lxml).

Login is a plain form POST (POST /login {username,password}); searchstd returns
a 9-cell HTML table per class. We parse it with html.parser and merge the genre
into output/data/students.json (adds a `sex` field: 'M' | 'F').

Usage (WSL):
  python3 genre_rescrape.py --probe         # dump first rows' cells to find genre col
  python3 genre_rescrape.py --col <N>       # full re-scrape, genre at td index N
"""
import json
import os
import sys
import time
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.parse import urlencode, urljoin
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE_URL = "https://admin.educakids.tn"
LOGIN_PATH = "/login"
DATA = Path(__file__).parent / "output" / "data"


def read_env() -> dict:
    env = {}
    p = Path(__file__).parent / ".env"
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def make_opener():
    return build_opener(HTTPCookieProcessor(CookieJar()))


def login(opener, ident: str, pwd: str) -> None:
    opener.open(BASE_URL, timeout=30).read()  # prime cookies
    data = urlencode({"username": ident, "password": pwd}).encode()
    body = opener.open(Request(urljoin(BASE_URL, LOGIN_PATH), data=data), timeout=30).read().decode("utf-8", "replace")
    low = body.lower()
    if "mot de passe" in low and "se connecter" in low:
        raise SystemExit("Login failed — still on login page.")


class RowParser(HTMLParser):
    """Collect rows as lists of cell-texts, plus the studentid from any <a href>."""

    def __init__(self):
        super().__init__()
        self.rows: list[dict] = []
        self._in_tr = False
        self._in_td = False
        self._cells: list[str] = []
        self._buf: list[str] = []
        self._sid = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._in_tr, self._cells, self._sid = True, [], None
        elif tag == "td" and self._in_tr:
            self._in_td, self._buf = True, []
        elif tag == "a" and self._in_tr:
            for k, v in attrs:
                if k == "href" and v and "studentid=" in v.lower():
                    self._sid = v.lower().split("studentid=")[1].split("&")[0]

    def handle_data(self, data):
        if self._in_td:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "td" and self._in_td:
            self._cells.append(" ".join("".join(self._buf).split()).strip())
            self._in_td = False
        elif tag == "tr" and self._in_tr:
            if any(self._cells):
                self.rows.append({"cells": self._cells, "sid": self._sid})
            self._in_tr = False


def fetch_class(opener, gid: str) -> list[dict]:
    qs = urlencode({"nom": "", "prenom": "", "age": "", "numad": "", "genre": "0", "groupe": gid})
    url = urljoin(BASE_URL, "/searchstd?" + qs)
    time.sleep(1.0)
    html = opener.open(url, timeout=30).read().decode("utf-8", "replace")
    p = RowParser()
    p.feed(html)
    return p.rows


def norm_sex(raw: str) -> str | None:
    r = raw.strip().lower()
    if r in ("m", "masculin", "garçon", "garcon", "garçons", "garcons", "male", "ذكر"):
        return "M"
    if r in ("f", "féminin", "feminin", "fille", "filles", "female", "أنثى", "انثى"):
        return "F"
    return None


def main() -> None:
    env = read_env()
    ident = env.get("EDUCAKIDS_IDENTIFIANT", "")
    pwd = env.get("EDUCAKIDS_PASSWORD", "")
    if not ident or not pwd:
        raise SystemExit("Missing EDUCAKIDS_IDENTIFIANT / EDUCAKIDS_PASSWORD in .env")

    students = json.loads((DATA / "students.json").read_text(encoding="utf-8"))
    class_ids = sorted({s["class_id"] for s in students})

    opener = make_opener()
    login(opener, ident, pwd)

    if "--probe" in sys.argv:
        rows = fetch_class(opener, class_ids[0])
        print(f"CLASS id={class_ids[0]} rows={len(rows)}")
        for r in rows[:6]:
            print("sid=%s | " % r["sid"] + " | ".join(f"[{i}]={c!r}" for i, c in enumerate(r["cells"])))
        return

    col = int(sys.argv[sys.argv.index("--col") + 1])
    sex_by_sid: dict[str, str] = {}
    raw_samples: dict[str, int] = {}
    for gid in class_ids:
        for r in fetch_class(opener, gid):
            if not r["sid"]:
                continue
            raw = r["cells"][col] if len(r["cells"]) > col else ""
            raw_samples[raw] = raw_samples.get(raw, 0) + 1
            s = norm_sex(raw)
            if s:
                sex_by_sid[r["sid"]] = s
    matched = 0
    for s in students:
        sx = sex_by_sid.get(str(s["student_id"]))
        if sx:
            s["sex"] = sx
            matched += 1
    (DATA / "students.json").write_text(json.dumps(students, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"genre column [{col}] raw value distribution: {raw_samples}")
    print(f"students with sex set: {matched}/{len(students)}")


if __name__ == "__main__":
    main()

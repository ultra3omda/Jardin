# EducaKids Export & Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scrapling-based tool that logs into `admin.educakids.tn`, audits its
functionality, and exports all data (JSON + CSV + binaries) for migration to Klasso.

**Architecture:** Pure-HTTP scraping with a persistent `FetcherSession` (login POST → reused
cookies). Two phases: (1) discovery/audit producing a site map, then a human checkpoint; (2)
data extraction per module using HTML fixtures captured during discovery. Runs in WSL Ubuntu
(Windows Smart App Control blocks lxml natively).

**Tech Stack:** Python 3.10 (WSL), scrapling 0.4.9 (FetcherSession + Selector), pytest,
python-dotenv, standard csv/json.

---

## Execution environment (read first)

ALL Python commands run inside WSL Ubuntu 22.04, never in Windows Python.

- Repo path from WSL: `/mnt/c/Users/ultra/Desktop/Projets/ecole-saas`
- Tool path from WSL: `/mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export`
- Run pattern from the Windows agent shell:
  `wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && <cmd>"`
- git commits run from the Windows side as usual (or `wsl git ...`); keep using the repo's normal git.

---

## File structure

```
tools/educakids-export/
├── README.md
├── requirements.txt
├── pytest.ini
├── .env.example
├── config.py          # constants: BASE_URL, LOGIN_PATH, delays, output paths, field names
├── auth.py            # login(session) + is_session_expired(selector)
├── http_client.py     # build_session(), get(url) with rate-limit + retry + re-login
├── discover.py        # crawl_navigation(session) -> SiteMap
├── audit.py           # build_audit_report(site_map) -> markdown str
├── extract.py         # extract_records(session, module) using a ModuleSpec
├── binaries.py        # download_binaries(session, records, module)
├── output.py          # write_json(), write_csv(), write_site_map(), append_error(), Progress
├── run.py             # CLI entrypoint: --phase discover|extract [--module NAME]
├── tests/
│   ├── fixtures/      # anonymized HTML captured during discovery
│   │   ├── login.html
│   │   └── ...
│   ├── test_auth.py
│   ├── test_http_client.py
│   ├── test_discover.py
│   ├── test_audit.py
│   ├── test_extract.py
│   ├── test_binaries.py
│   └── test_output.py
└── output/            # gitignored
```

---

## Task 1: Scaffolding, gitignore, WSL deps

**Files:**
- Create: `tools/educakids-export/requirements.txt`
- Create: `tools/educakids-export/.env.example`
- Create: `tools/educakids-export/pytest.ini`
- Create: `tools/educakids-export/README.md`
- Modify: `.gitignore` (repo root)

- [ ] **Step 1: Create requirements.txt**

```
scrapling==0.4.9
python-dotenv>=1.0
pytest>=8.0
```

- [ ] **Step 2: Create .env.example**

```
# Copy to .env (gitignored) and fill in. NEVER commit .env.
EDUCAKIDS_IDENTIFIANT=
EDUCAKIDS_PASSWORD=
```

- [ ] **Step 3: Create pytest.ini**

```ini
[pytest]
testpaths = tests
python_files = test_*.py
```

- [ ] **Step 4: Create README.md**

````markdown
# EducaKids Export & Audit

Scrapling tool to export data + audit `admin.educakids.tn` for migration to Klasso.
Runs in WSL Ubuntu (Windows Smart App Control blocks lxml).

## Setup (once)
```bash
wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && pip install -r requirements.txt"
cp .env.example .env   # then fill EDUCAKIDS_IDENTIFIANT / EDUCAKIDS_PASSWORD
```

## Run
```bash
# Phase 1 — discovery + audit (read-only)
wsl bash -lc "cd .../tools/educakids-export && python run.py --phase discover"

# Phase 2 — extraction (after reviewing output/audit/site-map.json)
wsl bash -lc "cd .../tools/educakids-export && python run.py --phase extract"
```

## Tests
```bash
wsl bash -lc "cd .../tools/educakids-export && pytest -v"
```
````

- [ ] **Step 5: Append to repo-root .gitignore**

```
# EducaKids export tool — secrets and PII output
tools/educakids-export/.env
tools/educakids-export/output/
```

- [ ] **Step 6: Install deps in WSL**

Run: `wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && pip install -r requirements.txt"`
Expected: scrapling + lxml install successfully (no SAC error in Linux).

- [ ] **Step 7: Verify scrapling imports in WSL**

Run: `wsl bash -lc "python3 -c 'from scrapling.fetchers import FetcherSession; print(\"ok\")'"`
Expected: `ok`

- [ ] **Step 8: Commit**

```bash
git add tools/educakids-export/requirements.txt tools/educakids-export/.env.example tools/educakids-export/pytest.ini tools/educakids-export/README.md .gitignore
git commit -m "chore(educakids-export): scaffolding, deps, gitignore"
```

---

## Task 2: config.py

**Files:**
- Create: `tools/educakids-export/config.py`

- [ ] **Step 1: Write config.py**

```python
"""Central configuration. No secrets here — those live in .env."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://admin.educakids.tn"
LOGIN_PATH = "/"            # login form is served at root
LOGIN_FIELD_USER = "identifiant"   # confirmed during discovery; adjust if input name differs
LOGIN_FIELD_PASS = "password"      # confirmed during discovery; adjust if input name differs

REQUEST_DELAY_SECONDS = 1.0
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3

OUTPUT_DIR = Path(__file__).parent / "output"
DATA_DIR = OUTPUT_DIR / "data"
CSV_DIR = OUTPUT_DIR / "csv"
FILES_DIR = OUTPUT_DIR / "files"
AUDIT_DIR = OUTPUT_DIR / "audit"
PROGRESS_FILE = OUTPUT_DIR / "progress.json"
ERRORS_FILE = OUTPUT_DIR / "errors.json"
LOG_FILE = OUTPUT_DIR / "run.log"

IDENTIFIANT = os.environ.get("EDUCAKIDS_IDENTIFIANT", "")
PASSWORD = os.environ.get("EDUCAKIDS_PASSWORD", "")


def ensure_dirs() -> None:
    for d in (DATA_DIR, CSV_DIR, FILES_DIR, AUDIT_DIR):
        d.mkdir(parents=True, exist_ok=True)
```

- [ ] **Step 2: Verify it imports in WSL**

Run: `wsl bash -lc "cd .../tools/educakids-export && python3 -c 'import config; print(config.BASE_URL)'"`
Expected: `https://admin.educakids.tn`

- [ ] **Step 3: Commit**

```bash
git add tools/educakids-export/config.py
git commit -m "feat(educakids-export): central config"
```

---

## Task 3: output.py (JSON/CSV/progress/errors)

**Files:**
- Create: `tools/educakids-export/output.py`
- Test: `tools/educakids-export/tests/test_output.py`

- [ ] **Step 1: Write the failing test**

```python
import json
from pathlib import Path
import output


def test_write_json_writes_records(tmp_path, monkeypatch):
    monkeypatch.setattr(output.config, "DATA_DIR", tmp_path)
    output.write_json("students", [{"id": 1, "name": "A"}])
    data = json.loads((tmp_path / "students.json").read_text(encoding="utf-8"))
    assert data == [{"id": 1, "name": "A"}]


def test_write_csv_writes_header_and_rows(tmp_path, monkeypatch):
    monkeypatch.setattr(output.config, "CSV_DIR", tmp_path)
    output.write_csv("students", [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}])
    text = (tmp_path / "students.csv").read_text(encoding="utf-8")
    assert "id,name" in text.splitlines()[0]
    assert "1,A" in text


def test_progress_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(output.config, "PROGRESS_FILE", tmp_path / "p.json")
    p = output.Progress.load()
    p.mark_done("students")
    p.save()
    assert output.Progress.load().is_done("students")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_output.py -v"`
Expected: FAIL (module `output` has no `write_json`).

- [ ] **Step 3: Write output.py**

```python
"""Output writers: JSON, CSV, progress, errors."""
import csv
import json
from dataclasses import dataclass, field

import config


def write_json(module: str, records: list[dict]) -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = config.DATA_DIR / f"{module}.json"
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(module: str, records: list[dict]) -> None:
    if not records:
        return
    config.CSV_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames: list[str] = []
    for rec in records:
        for key in rec:
            if key not in fieldnames:
                fieldnames.append(key)
    path = config.CSV_DIR / f"{module}.csv"
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for rec in records:
            writer.writerow({k: _flatten(v) for k, v in rec.items()})


def _flatten(value):
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return value


def append_error(url: str, reason: str) -> None:
    config.ERRORS_FILE.parent.mkdir(parents=True, exist_ok=True)
    errors = []
    if config.ERRORS_FILE.exists():
        errors = json.loads(config.ERRORS_FILE.read_text(encoding="utf-8"))
    errors.append({"url": url, "reason": reason})
    config.ERRORS_FILE.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")


@dataclass
class Progress:
    done: list[str] = field(default_factory=list)

    @classmethod
    def load(cls) -> "Progress":
        if config.PROGRESS_FILE.exists():
            data = json.loads(config.PROGRESS_FILE.read_text(encoding="utf-8"))
            return cls(done=data.get("done", []))
        return cls()

    def mark_done(self, module: str) -> None:
        if module not in self.done:
            self.done.append(module)

    def is_done(self, module: str) -> bool:
        return module in self.done

    def save(self) -> None:
        config.PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
        config.PROGRESS_FILE.write_text(
            json.dumps({"done": self.done}, ensure_ascii=False, indent=2), encoding="utf-8"
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_output.py -v"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/educakids-export/output.py tools/educakids-export/tests/test_output.py
git commit -m "feat(educakids-export): output writers (json/csv/progress/errors)"
```

---

## Task 4: http_client.py (session, rate-limit, retry)

**Files:**
- Create: `tools/educakids-export/http_client.py`
- Test: `tools/educakids-export/tests/test_http_client.py`

- [ ] **Step 1: Write the failing test**

```python
import http_client


class FakeSelector:
    def __init__(self, status, url):
        self.status = status
        self.url = url


def test_looks_like_login_redirect_true():
    assert http_client.looks_like_login("<form name=login>identifiant</form>") is True


def test_looks_like_login_redirect_false():
    assert http_client.looks_like_login("<table>students</table>") is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_http_client.py -v"`
Expected: FAIL (no module `http_client`).

- [ ] **Step 3: Write http_client.py**

```python
"""HTTP layer: persistent session, rate limiting, retry, login-redirect detection."""
import time

from scrapling.fetchers import FetcherSession

import config

_LOGIN_MARKERS = ("name=login", "identifiant", "se connecter", "mot de passe")


def build_session() -> FetcherSession:
    return FetcherSession(timeout=config.REQUEST_TIMEOUT_SECONDS)


def looks_like_login(html: str) -> bool:
    low = html.lower()
    return any(marker in low for marker in _LOGIN_MARKERS)


def get(session: FetcherSession, url: str):
    """GET with rate-limit + retry. Returns a scrapling Selector/response."""
    last_exc = None
    for attempt in range(config.MAX_RETRIES):
        try:
            time.sleep(config.REQUEST_DELAY_SECONDS)
            return session.get(url)
        except Exception as exc:  # network-level, retried
            last_exc = exc
            time.sleep(config.REQUEST_DELAY_SECONDS * (attempt + 1))
    raise last_exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_http_client.py -v"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/educakids-export/http_client.py tools/educakids-export/tests/test_http_client.py
git commit -m "feat(educakids-export): http session with rate-limit + retry"
```

---

## Task 5: auth.py (login + session-expired detection)

**Files:**
- Create: `tools/educakids-export/auth.py`
- Test: `tools/educakids-export/tests/test_auth.py`

> NOTE: The exact POST field names and form action are confirmed live in Task 7.
> `config.LOGIN_FIELD_USER/PASS` are adjusted there if the real input names differ.

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_auth.py -v"`
Expected: FAIL (no module `auth`).

- [ ] **Step 3: Write auth.py**

```python
"""Authentication: login POST + credential guard."""
from urllib.parse import urljoin

import config
import http_client


def assert_credentials() -> None:
    if not config.IDENTIFIANT or not config.PASSWORD:
        raise RuntimeError(
            "Missing credentials. Fill EDUCAKIDS_IDENTIFIANT / EDUCAKIDS_PASSWORD in .env."
        )


def build_login_payload() -> dict:
    return {
        config.LOGIN_FIELD_USER: config.IDENTIFIANT,
        config.LOGIN_FIELD_PASS: config.PASSWORD,
    }


def login(session) -> None:
    """POST credentials; raises if the result still looks like the login page."""
    assert_credentials()
    login_url = urljoin(config.BASE_URL, config.LOGIN_PATH)
    resp = session.post(login_url, data=build_login_payload())
    body = getattr(resp, "html_content", "") or getattr(resp, "body", "") or str(resp)
    if http_client.looks_like_login(body):
        raise RuntimeError("Login failed — still on login page. Check credentials/field names.")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_auth.py -v"`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/educakids-export/auth.py tools/educakids-export/tests/test_auth.py
git commit -m "feat(educakids-export): login + credential guard"
```

---

## Task 6: CHECKPOINT — credentials + live login smoke test

> This task requires the user's real credentials. STOP and ask the user to fill `.env`
> before running. Do not print credentials. This is a live network action.

- [ ] **Step 1: Ask the user to create `.env`**

Tell the user (do NOT do it for them):
```bash
# In tools/educakids-export/, copy and fill:
cp .env.example .env
# then edit .env:  EDUCAKIDS_IDENTIFIANT=...   EDUCAKIDS_PASSWORD=...
```

- [ ] **Step 2: Capture the real login form field names**

Run: `wsl bash -lc "cd .../tools/educakids-export && python3 -c \"import http_client,config; s=http_client.build_session(); r=s.get(config.BASE_URL); print(r.css('form input::attr(name)'))\""`
Expected: a list of input names. Update `config.LOGIN_FIELD_USER/PASS` and `LOGIN_PATH`
(form action) to match the real names, then commit that config fix.

- [ ] **Step 3: Live login smoke test**

Run: `wsl bash -lc "cd .../tools/educakids-export && python3 -c \"import auth,http_client; s=http_client.build_session(); auth.login(s); print('login OK')\""`
Expected: `login OK` (no exception). If it raises, fix field names/payload and retry.

- [ ] **Step 4: Commit any config corrections**

```bash
git add tools/educakids-export/config.py
git commit -m "fix(educakids-export): real login field names from live form"
```

---

## Task 7: discover.py (navigation crawl → site map)

**Files:**
- Create: `tools/educakids-export/discover.py`
- Test: `tools/educakids-export/tests/test_discover.py`
- Fixture: `tools/educakids-export/tests/fixtures/nav.html`

- [ ] **Step 1: Create the fixture (anonymized nav HTML)**

Create `tests/fixtures/nav.html` with a representative menu (captured/sanitized from the live
site during Task 6, or hand-authored to match its structure):

```html
<html><body>
<nav>
  <a href="/eleves">Élèves</a>
  <a href="/classes">Classes</a>
  <a href="/personnel">Personnel</a>
  <a href="https://external.example/ignore">External</a>
  <a href="#">Empty</a>
</nav>
</body></html>
```

- [ ] **Step 2: Write the failing test**

```python
from pathlib import Path
from scrapling.parser import Selector
import discover

FIXTURE = Path(__file__).parent / "fixtures" / "nav.html"


def test_extract_internal_links_keeps_same_host_only():
    sel = Selector(FIXTURE.read_text(encoding="utf-8"))
    links = discover.extract_internal_links(sel, base_url="https://admin.educakids.tn")
    assert "https://admin.educakids.tn/eleves" in links
    assert "https://admin.educakids.tn/classes" in links
    assert all("external.example" not in u for u in links)
    assert all(not u.endswith("#") for u in links)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_discover.py -v"`
Expected: FAIL (no module `discover`).

- [ ] **Step 4: Write discover.py**

```python
"""Discovery crawl: map navigation into a site map of modules/routes."""
from urllib.parse import urljoin, urlparse

import config
import http_client


def extract_internal_links(selector, base_url: str) -> list[str]:
    host = urlparse(base_url).netloc
    out: list[str] = []
    for href in selector.css("a::attr(href)"):
        href = str(href).strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue
        absolute = urljoin(base_url + "/", href)
        if urlparse(absolute).netloc != host:
            continue
        clean = absolute.split("#")[0]
        if clean not in out:
            out.append(clean)
    return out


def crawl_navigation(session, max_depth: int = 2) -> dict:
    """BFS from the post-login landing page, collecting internal routes."""
    seen: set[str] = set()
    site_map: dict[str, dict] = {}
    frontier = [config.BASE_URL]
    depth = 0
    while frontier and depth <= max_depth:
        next_frontier: list[str] = []
        for url in frontier:
            if url in seen:
                continue
            seen.add(url)
            try:
                page = http_client.get(session, url)
            except Exception as exc:
                continue
            links = extract_internal_links(page, config.BASE_URL)
            site_map[url] = {"links": links, "title": _title(page)}
            next_frontier.extend(links)
        frontier = next_frontier
        depth += 1
    return {"pages": site_map, "modules": _group_modules(site_map)}


def _title(page) -> str:
    t = page.css("title::text")
    return str(t[0]).strip() if t else ""


def _group_modules(site_map: dict) -> dict:
    """Group routes by their first path segment as a coarse module key."""
    modules: dict[str, list[str]] = {}
    for url in site_map:
        seg = urlparse(url).path.strip("/").split("/")[0] or "root"
        modules.setdefault(seg, [])
        if url not in modules[seg]:
            modules[seg].append(url)
    return modules
```

- [ ] **Step 5: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_discover.py -v"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/educakids-export/discover.py tools/educakids-export/tests/test_discover.py tools/educakids-export/tests/fixtures/nav.html
git commit -m "feat(educakids-export): navigation discovery crawl"
```

---

## Task 8: audit.py (site map → audit report)

**Files:**
- Create: `tools/educakids-export/audit.py`
- Test: `tools/educakids-export/tests/test_audit.py`

- [ ] **Step 1: Write the failing test**

```python
import audit


def test_build_audit_report_lists_modules():
    site_map = {
        "pages": {
            "https://admin.educakids.tn/eleves": {"links": [], "title": "Élèves"},
        },
        "modules": {"eleves": ["https://admin.educakids.tn/eleves"]},
    }
    report = audit.build_audit_report(site_map)
    assert "# Audit" in report
    assert "eleves" in report
    assert "https://admin.educakids.tn/eleves" in report
```

- [ ] **Step 2: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_audit.py -v"`
Expected: FAIL.

- [ ] **Step 3: Write audit.py**

```python
"""Audit report generation from a site map."""


def build_audit_report(site_map: dict) -> str:
    modules = site_map.get("modules", {})
    pages = site_map.get("pages", {})
    lines = ["# Audit fonctionnel — admin.educakids.tn", ""]
    lines.append(f"Total pages découvertes : {len(pages)}")
    lines.append(f"Total modules : {len(modules)}")
    lines.append("")
    for module, urls in sorted(modules.items()):
        lines.append(f"## Module: {module}")
        lines.append(f"Routes ({len(urls)}) :")
        for url in urls:
            title = pages.get(url, {}).get("title", "")
            lines.append(f"- {url} — {title}")
        lines.append("")
    return "\n".join(lines)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_audit.py -v"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/educakids-export/audit.py tools/educakids-export/tests/test_audit.py
git commit -m "feat(educakids-export): audit report generator"
```

---

## Task 9: run.py discover phase + CHECKPOINT

**Files:**
- Create: `tools/educakids-export/run.py`

- [ ] **Step 1: Write run.py (discover branch)**

```python
"""CLI entrypoint."""
import argparse
import json

import config
import auth
import http_client
import discover
import audit
import output


def run_discover() -> None:
    config.ensure_dirs()
    session = http_client.build_session()
    auth.login(session)
    site_map = discover.crawl_navigation(session)
    (config.AUDIT_DIR / "site-map.json").write_text(
        json.dumps(site_map, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (config.AUDIT_DIR / "audit-report.md").write_text(
        audit.build_audit_report(site_map), encoding="utf-8"
    )
    print(f"Discovery done. {len(site_map['pages'])} pages, {len(site_map['modules'])} modules.")
    print(f"Review: {config.AUDIT_DIR / 'site-map.json'}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["discover", "extract"], required=True)
    parser.add_argument("--module", default=None)
    args = parser.parse_args()
    if args.phase == "discover":
        run_discover()
    else:
        raise SystemExit("Extract phase is defined in Task 11 (after discovery review).")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the real discovery phase**

Run: `wsl bash -lc "cd .../tools/educakids-export && python run.py --phase discover"`
Expected: prints page/module counts; writes `output/audit/site-map.json` + `audit-report.md`.

- [ ] **Step 3: CHECKPOINT — present the site map to the user**

Read `output/audit/audit-report.md` and present the discovered modules to the user.
STOP and get explicit approval on what to extract before continuing to Task 10/11.

- [ ] **Step 4: Commit**

```bash
git add tools/educakids-export/run.py
git commit -m "feat(educakids-export): discovery phase + checkpoint"
```

---

## Task 10: extract.py (generic module extractor)

> The exact selectors per module come from the real HTML reviewed at the Task 9 checkpoint.
> This task builds the GENERIC engine + ONE worked example (the first approved module). Each
> additional module reuses `ModuleSpec` with its own selectors (Task 11).

**Files:**
- Create: `tools/educakids-export/extract.py`
- Test: `tools/educakids-export/tests/test_extract.py`
- Fixture: `tools/educakids-export/tests/fixtures/list_page.html`, `detail_page.html`

- [ ] **Step 1: Create fixtures (sanitized from live module, no real PII)**

`tests/fixtures/list_page.html`:
```html
<html><body>
<table class="list">
  <tr class="row"><td><a href="/eleves/1">Alpha</a></td></tr>
  <tr class="row"><td><a href="/eleves/2">Beta</a></td></tr>
</table>
<a class="next" href="/eleves?page=2">Suivant</a>
</body></html>
```

`tests/fixtures/detail_page.html`:
```html
<html><body>
<dl>
  <dt>Nom</dt><dd id="nom">Alpha</dd>
  <dt>Date</dt><dd id="date">2020-01-01</dd>
</dl>
</body></html>
```

- [ ] **Step 2: Write the failing test**

```python
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_extract.py -v"`
Expected: FAIL (no module `extract`).

- [ ] **Step 4: Write extract.py**

```python
"""Generic, selector-driven module extractor."""
from dataclasses import dataclass
from urllib.parse import urljoin

import config
import http_client
import output


@dataclass
class ModuleSpec:
    name: str
    row_selector: str          # CSS yielding detail-page hrefs on a list page
    next_selector: str         # CSS yielding the "next page" href (or "")
    fields: dict               # field_name -> CSS selector on the detail page


def extract_list_links(selector, spec: ModuleSpec) -> list[str]:
    if not spec.row_selector:
        return []
    return [str(h).strip() for h in selector.css(spec.row_selector) if str(h).strip()]


def find_next_page(selector, spec: ModuleSpec):
    if not spec.next_selector:
        return None
    found = selector.css(spec.next_selector)
    return str(found[0]).strip() if found else None


def extract_detail(selector, spec: ModuleSpec, source_url: str) -> dict:
    rec: dict = {}
    for field, css in spec.fields.items():
        vals = selector.css(css)
        rec[field] = str(vals[0]).strip() if vals else None
    rec["_source_url"] = source_url
    return rec


def extract_records(session, spec: ModuleSpec) -> list[dict]:
    """Walk all list pages, follow each detail link, extract fields."""
    records: list[dict] = []
    page_url = urljoin(config.BASE_URL + "/", spec.name)
    while page_url:
        try:
            list_page = http_client.get(session, page_url)
        except Exception as exc:
            output.append_error(page_url, f"list fetch: {exc}")
            break
        for href in extract_list_links(list_page, spec):
            detail_url = urljoin(config.BASE_URL + "/", href)
            try:
                detail = http_client.get(session, detail_url)
                records.append(extract_detail(detail, spec, detail_url))
            except Exception as exc:
                output.append_error(detail_url, f"detail fetch: {exc}")
        nxt = find_next_page(list_page, spec)
        page_url = urljoin(config.BASE_URL + "/", nxt) if nxt else None
    return records
```

- [ ] **Step 5: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_extract.py -v"`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add tools/educakids-export/extract.py tools/educakids-export/tests/test_extract.py tools/educakids-export/tests/fixtures/list_page.html tools/educakids-export/tests/fixtures/detail_page.html
git commit -m "feat(educakids-export): generic selector-driven extractor"
```

---

## Task 11: binaries.py (download photos/PDF)

**Files:**
- Create: `tools/educakids-export/binaries.py`
- Test: `tools/educakids-export/tests/test_binaries.py`

- [ ] **Step 1: Write the failing test**

```python
import binaries


def test_collect_binary_urls_finds_img_and_pdf():
    records = [
        {"photo": "/files/1.jpg", "doc": "/files/1.pdf", "name": "x"},
    ]
    urls = binaries.collect_binary_urls(records, fields=["photo", "doc"])
    assert "/files/1.jpg" in urls
    assert "/files/1.pdf" in urls


def test_safe_filename_strips_path():
    assert binaries.safe_filename("https://x/a/b/photo.jpg") == "photo.jpg"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_binaries.py -v"`
Expected: FAIL.

- [ ] **Step 3: Write binaries.py**

```python
"""Download binary assets (photos, PDFs) referenced by records."""
from pathlib import Path
from urllib.parse import urljoin, urlparse

import config
import http_client
import output


def collect_binary_urls(records: list[dict], fields: list[str]) -> list[str]:
    urls: list[str] = []
    for rec in records:
        for f in fields:
            val = rec.get(f)
            if val and val not in urls:
                urls.append(val)
    return urls


def safe_filename(url: str) -> str:
    return Path(urlparse(url).path).name or "file.bin"


def download_binaries(session, urls: list[str], module: str) -> None:
    target = config.FILES_DIR / module
    target.mkdir(parents=True, exist_ok=True)
    for url in urls:
        absolute = urljoin(config.BASE_URL + "/", url)
        try:
            resp = http_client.get(session, absolute)
            content = getattr(resp, "body", None) or getattr(resp, "content", b"")
            (target / safe_filename(absolute)).write_bytes(content)
        except Exception as exc:
            output.append_error(absolute, f"binary download: {exc}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest tests/test_binaries.py -v"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/educakids-export/binaries.py tools/educakids-export/tests/test_binaries.py
git commit -m "feat(educakids-export): binary asset downloader"
```

---

## Task 12: run.py extract phase (wire modules from discovery)

> The list of `ModuleSpec`s is filled in AFTER the Task 9 checkpoint, using the real
> selectors observed in each module's list/detail HTML. One ModuleSpec per approved module.

**Files:**
- Modify: `tools/educakids-export/run.py`

- [ ] **Step 1: Add a module registry + extract branch to run.py**

```python
# Add near top of run.py:
import extract
import binaries
from extract import ModuleSpec

# Filled in after discovery review (Task 9). Example shape — REPLACE selectors with real ones:
MODULES: list[ModuleSpec] = [
    # ModuleSpec(name="eleves", row_selector="table.list tr a::attr(href)",
    #            next_selector="a.next::attr(href)",
    #            fields={"nom": "#nom::text", "date_naissance": "#date::text"}),
]

# Optional per-module binary fields:
BINARY_FIELDS: dict[str, list[str]] = {
    # "eleves": ["photo"],
}


def run_extract(only_module: str | None) -> None:
    config.ensure_dirs()
    session = http_client.build_session()
    auth.login(session)
    progress = output.Progress.load()
    for spec in MODULES:
        if only_module and spec.name != only_module:
            continue
        if progress.is_done(spec.name):
            print(f"skip {spec.name} (already done)")
            continue
        print(f"extracting {spec.name} ...")
        records = extract.extract_records(session, spec)
        output.write_json(spec.name, records)
        output.write_csv(spec.name, records)
        bin_fields = BINARY_FIELDS.get(spec.name)
        if bin_fields:
            urls = binaries.collect_binary_urls(records, bin_fields)
            binaries.download_binaries(session, urls, spec.name)
        progress.mark_done(spec.name)
        progress.save()
        print(f"  {len(records)} records")
```

Then change the `--phase extract` branch in `main()` from raising to:
```python
        run_extract(args.module)
```

- [ ] **Step 2: Populate MODULES from the real discovery output**

For each approved module, view its list page + one detail page (in WSL), note the real CSS
selectors, and add a `ModuleSpec`. Verify selectors against saved HTML before running full extract.

- [ ] **Step 3: Run extraction (one module first)**

Run: `wsl bash -lc "cd .../tools/educakids-export && python run.py --phase extract --module <first_module>"`
Expected: writes `output/data/<module>.json` + `output/csv/<module>.csv`; prints record count.
Verify a few records by hand against the live site.

- [ ] **Step 4: Run full extraction**

Run: `wsl bash -lc "cd .../tools/educakids-export && python run.py --phase extract"`
Expected: all modules extracted; `errors.json` reviewed for any failures.

- [ ] **Step 5: Commit**

```bash
git add tools/educakids-export/run.py
git commit -m "feat(educakids-export): extraction phase wiring per module"
```

---

## Task 13: Final verification + summary

- [ ] **Step 1: Run the full test suite**

Run: `wsl bash -lc "cd .../tools/educakids-export && pytest -v"`
Expected: all tests PASS.

- [ ] **Step 2: Sanity-check outputs**

Confirm: every approved module has a `data/<module>.json` and `csv/<module>.csv`; binaries
present in `files/`; `errors.json` empty or reviewed; counts match expectations from the site.

- [ ] **Step 3: Write a short migration handoff note**

Create `output/audit/EXTRACTION_SUMMARY.md` listing per-module record counts, binary counts,
and any known gaps — this feeds the later Klasso import wave.

- [ ] **Step 4: Open PR**

```bash
git push -u origin feat/educakids-export
gh pr create --base main --title "feat: EducaKids export & audit tool" --body "Scrapling tool to export data + audit admin.educakids.tn for migration to Klasso. Output is gitignored (PII)."
```

---

## Self-review notes

- **Spec coverage:** strategy (Task 4/5), 2-phase flow (Tasks 9 + 12 with checkpoint), error
  handling/resume (output.py Progress/errors, http retry), security (.env + gitignore in Task 1),
  tests (each task), binaries (Task 11), audit (Task 8) — all mapped.
- **Live-dependent selectors** are explicitly deferred to post-checkpoint (Tasks 10–12), with a
  generic engine fully TDD'd against fixtures so only data, not logic, is filled in later.
- **scrapling API note:** `FetcherSession.get/.post` and `Selector.css(...::text/::attr())` per
  scrapling 0.4.9. Response body accessor is verified live in Task 6 (Step 3) and adjusted if the
  attribute name differs (`.html_content` / `.body`).

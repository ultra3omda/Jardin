"""Central configuration. No secrets here — those live in .env."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://admin.educakids.tn"
LOGIN_PATH = "/login"       # login form action (POST)
DASHBOARD_PATH = "/index"   # authenticated landing page
LOGIN_FIELD_USER = "username"      # confirmed during discovery; adjust if input name differs
LOGIN_FIELD_PASS = "password"      # confirmed during discovery; adjust if input name differs

REQUEST_DELAY_SECONDS = 1.0
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 3
MAX_PAGES = 5000           # safety cap for the discovery crawl

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

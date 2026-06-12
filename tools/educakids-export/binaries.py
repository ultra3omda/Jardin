"""Download binary assets (photos, PDFs) and native export endpoints (Excel/PDF)."""
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

import config
import http_client
import output

# Substrings (lowercased) that mark a route as an export/download endpoint.
EXPORT_MARKERS = (
    "export", "download", "telecharger", "télécharger", "filedownload", "recu", "pdf",
)


def collect_binary_urls(records: list[dict], fields: list[str]) -> list[str]:
    urls: list[str] = []
    for rec in records:
        for f in fields:
            val = rec.get(f)
            if val and val not in urls:
                urls.append(val)
    return urls


def safe_filename(url: str) -> str:
    """Unique, filesystem-safe name from a URL's path AND query string."""
    parsed = urlparse(url)
    base = Path(parsed.path).name or "file.bin"
    if parsed.query:
        q = re.sub(r"[^A-Za-z0-9._-]+", "-", parsed.query).strip("-")
        if q:
            base = f"{base}_{q}"
    return base or "file.bin"


def find_export_endpoints(site_map: dict) -> list[str]:
    """Return discovered URLs that look like Excel/PDF export endpoints."""
    out: list[str] = []
    for url in site_map.get("pages", {}):
        seg = urlparse(url).path.rsplit("/", 1)[-1].lower()
        if any(marker in seg for marker in EXPORT_MARKERS):
            if url not in out:
                out.append(url)
    return out


def _response_bytes(resp) -> bytes:
    for attr in ("body", "content"):
        val = getattr(resp, attr, None)
        if isinstance(val, bytes):
            return val
        if isinstance(val, str):
            return val.encode("utf-8", errors="replace")
    return str(resp).encode("utf-8", errors="replace")


_MAGIC = (
    (b"%PDF", ".pdf"),
    (b"PK\x03\x04", ".xlsx"),
    (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", ".xls"),
)


def _sniff_extension(content: bytes) -> str:
    head = content[:8]
    for magic, ext in _MAGIC:
        if head.startswith(magic):
            return ext
    low = content[:512].lower()
    if b"<html" in low or b"<table" in low or b"<!doctype" in low:
        return ".html"
    return ""


def _clean_content(raw: bytes) -> bytes:
    """Strip the leading blank lines some Tomcat endpoints prepend before the file."""
    return raw.lstrip(b"\r\n\t ")


def download_binaries(session, urls: list[str], subdir: str) -> int:
    """Download each URL into output/files/<subdir>/. Returns count saved."""
    target = config.FILES_DIR / subdir
    target.mkdir(parents=True, exist_ok=True)
    saved = 0
    for url in urls:
        absolute = urljoin(config.BASE_URL + "/", url)
        try:
            resp = http_client.get(session, absolute)
            content = _clean_content(_response_bytes(resp))
            name = safe_filename(absolute)
            if not Path(name).suffix:
                name += _sniff_extension(content)
            (target / name).write_bytes(content)
            saved += 1
        except Exception as exc:
            output.append_error(absolute, f"binary download: {exc}")
    return saved

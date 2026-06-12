"""Download binary assets (photos, PDFs) and native export endpoints (Excel/PDF)."""
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
    return Path(urlparse(url).path).name or "file.bin"


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


def download_binaries(session, urls: list[str], subdir: str) -> int:
    """Download each URL into output/files/<subdir>/. Returns count saved."""
    target = config.FILES_DIR / subdir
    target.mkdir(parents=True, exist_ok=True)
    saved = 0
    for url in urls:
        absolute = urljoin(config.BASE_URL + "/", url)
        try:
            resp = http_client.get(session, absolute)
            (target / safe_filename(absolute)).write_bytes(_response_bytes(resp))
            saved += 1
        except Exception as exc:
            output.append_error(absolute, f"binary download: {exc}")
    return saved

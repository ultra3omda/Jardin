"""Generic, selector-driven module extractor."""
from dataclasses import dataclass, field
from urllib.parse import urljoin

import config
import http_client
import output


@dataclass
class ModuleSpec:
    name: str
    row_selector: str          # CSS yielding detail-page hrefs on a list page
    next_selector: str         # CSS yielding the "next page" href (or "")
    fields: dict = field(default_factory=dict)  # field_name -> CSS selector on detail page


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
    for field_name, css in spec.fields.items():
        vals = selector.css(css)
        rec[field_name] = str(vals[0]).strip() if vals else None
    rec["_source_url"] = source_url
    return rec


def extract_records(session, spec: ModuleSpec) -> list[dict]:
    """Walk all list pages, follow each detail link, extract fields."""
    records: list[dict] = []
    page_url = urljoin(config.BASE_URL + "/", spec.name)
    seen_pages: set[str] = set()
    while page_url and page_url not in seen_pages:
        seen_pages.add(page_url)
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

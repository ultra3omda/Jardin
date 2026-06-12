"""Discovery crawl: map navigation into a site map of modules/routes.

Full-depth BFS bounded by a visited-set and config.MAX_PAGES, with a safety
denylist so we never follow destructive or session-killing links.
"""
from urllib.parse import urljoin, urlparse

import config
import http_client

DANGEROUS_SUBSTRINGS = (
    "logout", "deconnexion", "déconnexion", "logoff", "signout",
    "supprimer", "/delete", "delete=", "/del/", "remove", "destroy",
    "desactiver", "/drop",
)


def is_dangerous_link(href: str) -> bool:
    low = href.lower()
    return any(bad in low for bad in DANGEROUS_SUBSTRINGS)


def extract_internal_links(selector, base_url: str) -> list[str]:
    host = urlparse(base_url).netloc
    out: list[str] = []
    for href in selector.css("a::attr(href)"):
        href = str(href).strip()
        if not href or href.startswith("#"):
            continue
        if href.startswith(("javascript:", "mailto:", "tel:")):
            continue
        if is_dangerous_link(href):
            continue
        absolute = urljoin(base_url + "/", href)
        if urlparse(absolute).netloc != host:
            continue
        clean = absolute.split("#")[0]
        if clean not in out:
            out.append(clean)
    return out


def crawl_navigation(session) -> dict:
    """Full-depth BFS from the post-login landing page, collecting internal routes.

    Bounded by config.MAX_PAGES. Records whether the cap was hit so callers never
    mistake a truncated crawl for a complete one.
    """
    seen: set[str] = set()
    site_map: dict[str, dict] = {}
    frontier = [urljoin(config.BASE_URL, config.DASHBOARD_PATH)]
    cap_hit = False
    while frontier:
        url = frontier.pop(0)
        if url in seen:
            continue
        if len(seen) >= config.MAX_PAGES:
            cap_hit = True
            break
        seen.add(url)
        try:
            page = http_client.get(session, url)
        except Exception:
            continue
        links = extract_internal_links(page, url)
        site_map[url] = {"links": links, "title": _title(page)}
        for link in links:
            if link not in seen:
                frontier.append(link)
    return {
        "pages": site_map,
        "modules": _group_modules(site_map),
        "cap_hit": cap_hit,
        "page_count": len(site_map),
    }


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

"""Audit report generation from a site map."""


def build_audit_report(site_map: dict) -> str:
    modules = site_map.get("modules", {})
    pages = site_map.get("pages", {})
    lines = ["# Audit fonctionnel — admin.educakids.tn", ""]
    if site_map.get("cap_hit"):
        lines.append(
            "> ⚠️ ATTENTION : le plafond MAX_PAGES a été atteint — le crawl est "
            "TRONQUÉ, l'audit n'est pas exhaustif. Relancer avec un MAX_PAGES plus élevé."
        )
        lines.append("")
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

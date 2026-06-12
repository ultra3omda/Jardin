"""CLI entrypoint for the EducaKids export tool."""
import argparse
import json

import config
import auth
import http_client
import discover
import audit


def run_discover() -> None:
    config.ensure_dirs()
    with http_client.build_session() as session:
        auth.login(session)
        site_map = discover.crawl_navigation(session)
    (config.AUDIT_DIR / "site-map.json").write_text(
        json.dumps(site_map, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (config.AUDIT_DIR / "audit-report.md").write_text(
        audit.build_audit_report(site_map), encoding="utf-8"
    )
    cap = " (CAP HIT — truncated!)" if site_map.get("cap_hit") else ""
    print(f"Discovery done. {site_map.get('page_count', 0)} pages, "
          f"{len(site_map.get('modules', {}))} modules{cap}.")
    print(f"Review: {config.AUDIT_DIR / 'site-map.json'}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=["discover", "extract"], required=True)
    parser.add_argument("--module", default=None)
    args = parser.parse_args()
    if args.phase == "discover":
        run_discover()
    else:
        raise SystemExit("Extract phase is implemented in a later task.")


if __name__ == "__main__":
    main()

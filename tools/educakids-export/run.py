"""CLI entrypoint for the EducaKids export tool."""
import argparse
import json
from pathlib import Path

import config
import auth
import http_client
import discover
import audit
import output
import extract
import binaries
import students
import tabular


# HTML modules WITHOUT a native export, filled after reviewing the site map.
# Each entry: extract.ModuleSpec(name=..., row_selector=..., next_selector=..., fields={...})
MODULES: list = []


def _load_site_map() -> dict:
    path = config.AUDIT_DIR / "site-map.json"
    if not path.exists():
        raise SystemExit(
            "No site-map.json found. Run `--phase discover` first."
        )
    return json.loads(path.read_text(encoding="utf-8"))


def run_extract(only_module: str | None) -> None:
    config.ensure_dirs()
    site_map = _load_site_map()
    export_urls = binaries.find_export_endpoints(site_map)
    progress = output.Progress.load()
    with http_client.build_session() as session:
        auth.login(session)

        # 1) PRIMARY: native export endpoints (Excel/PDF) — the clean migration path.
        # Split dataset-level exports from the bulk per-activity PDFs so the .xls
        # conversion (step 4) can glob a clean datasets/ dir, and so the 1600+
        # activity PDFs land in their own folder.
        if export_urls and not (only_module and only_module != "exports"):
            if progress.is_done("exports"):
                print("skip exports (already done)")
            else:
                datasets = [u for u in export_urls if "downloadactivitypdf" not in u.lower()]
                activities = [u for u in export_urls if "downloadactivitypdf" in u.lower()]
                print(f"downloading {len(datasets)} dataset exports "
                      f"+ {len(activities)} activity PDFs ...")
                n1 = binaries.download_binaries(session, datasets, "exports/datasets")
                n2 = binaries.download_binaries(session, activities, "exports/activities")
                print(f"  {n1} dataset files + {n2} activity PDFs saved")
                progress.mark_done("exports")
                progress.save()

        # 3) Student roster (per-class searchstd endpoint).
        if not (only_module and only_module != "students"):
            if progress.is_done("students"):
                print("skip students (already done)")
            else:
                roster = students.extract_all_students(session)
                output.write_json("students", roster)
                output.write_csv("students", roster)
                print(f"  {len(roster)} students extracted")
                progress.mark_done("students")
                progress.save()

        # 2) SECONDARY: HTML modules without an export.
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
            progress.mark_done(spec.name)
            progress.save()
            print(f"  {len(records)} records")

    # 4) Convert downloaded .xls dataset exports to JSON + CSV.
    exports_dir = config.FILES_DIR / "exports" / "datasets"
    if exports_dir.exists():
        for xls in sorted(exports_dir.glob("*.xls")):
            try:
                records = tabular.xls_to_records(xls)
            except Exception as exc:
                output.append_error(str(xls), f"xls parse: {exc}")
                continue
            name = f"export_{xls.stem}"
            output.write_json(name, records)
            output.write_csv(name, records)
            print(f"  {xls.name}: {len(records)} rows -> {name}.json/csv")


def run_socle() -> None:
    """Extraction rapide pour l'import « socle » (CI) : élèves + 3 exports
    (paiements espèces/chèques + enseignants), SANS le crawl discover ni les
    ~1634 PDF d'activités. Produit output/data/{students, export_*}.json."""
    from urllib.parse import urljoin
    config.ensure_dirs()
    socle_paths = ["/ExportExcel", "/ExportExcel2", "/ExportteacherFile"]
    urls = [urljoin(config.BASE_URL, p) for p in socle_paths]
    with http_client.build_session() as session:
        auth.login(session)
        n = binaries.download_binaries(session, urls, "exports/datasets")
        print(f"  {n} dataset exports saved")
        roster = students.extract_all_students(session)
        output.write_json("students", roster)
        output.write_csv("students", roster)
        print(f"  {len(roster)} students extracted")
    exports_dir = config.FILES_DIR / "exports" / "datasets"
    if exports_dir.exists():
        for xls in sorted(exports_dir.glob("*.xls")):
            try:
                records = tabular.xls_to_records(xls)
            except Exception as exc:
                output.append_error(str(xls), f"xls parse: {exc}")
                continue
            name = f"export_{xls.stem}"
            output.write_json(name, records)
            output.write_csv(name, records)
            print(f"  {xls.name}: {len(records)} rows -> {name}.json")


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
    parser.add_argument("--phase", choices=["discover", "extract", "socle"], required=True)
    parser.add_argument("--module", default=None)
    args = parser.parse_args()
    if args.phase == "discover":
        run_discover()
    elif args.phase == "socle":
        run_socle()
    else:
        run_extract(args.module)


if __name__ == "__main__":
    main()

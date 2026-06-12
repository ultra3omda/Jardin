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


def test_build_audit_report_warns_when_cap_hit():
    site_map = {
        "pages": {}, "modules": {}, "cap_hit": True, "page_count": 5000,
    }
    report = audit.build_audit_report(site_map)
    assert "MAX_PAGES" in report or "plafond" in report.lower() or "truncat" in report.lower()

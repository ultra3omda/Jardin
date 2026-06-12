import json
import run


def test_load_site_map_raises_when_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(run.config, "AUDIT_DIR", tmp_path)
    try:
        run._load_site_map()
        assert False, "expected SystemExit"
    except SystemExit as exc:
        assert "discover" in str(exc).lower()


def test_load_site_map_reads_json(tmp_path, monkeypatch):
    monkeypatch.setattr(run.config, "AUDIT_DIR", tmp_path)
    (tmp_path / "site-map.json").write_text(
        json.dumps({"pages": {"https://x/ExportExcel": {}}}), encoding="utf-8"
    )
    sm = run._load_site_map()
    assert "pages" in sm

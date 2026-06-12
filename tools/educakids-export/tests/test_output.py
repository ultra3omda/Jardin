import json
from pathlib import Path
import output


def test_write_json_writes_records(tmp_path, monkeypatch):
    monkeypatch.setattr(output.config, "DATA_DIR", tmp_path)
    output.write_json("students", [{"id": 1, "name": "A"}])
    data = json.loads((tmp_path / "students.json").read_text(encoding="utf-8"))
    assert data == [{"id": 1, "name": "A"}]


def test_write_csv_writes_header_and_rows(tmp_path, monkeypatch):
    monkeypatch.setattr(output.config, "CSV_DIR", tmp_path)
    output.write_csv("students", [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}])
    text = (tmp_path / "students.csv").read_text(encoding="utf-8")
    assert "id,name" in text.splitlines()[0]
    assert "1,A" in text


def test_progress_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(output.config, "PROGRESS_FILE", tmp_path / "p.json")
    p = output.Progress.load()
    p.mark_done("students")
    p.save()
    assert output.Progress.load().is_done("students")

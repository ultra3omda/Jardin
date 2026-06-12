"""Output writers: JSON, CSV, progress, errors."""
import csv
import json
from dataclasses import dataclass, field

import config


def write_json(module: str, records: list[dict]) -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = config.DATA_DIR / f"{module}.json"
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(module: str, records: list[dict]) -> None:
    if not records:
        return
    config.CSV_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames: list[str] = []
    for rec in records:
        for key in rec:
            if key not in fieldnames:
                fieldnames.append(key)
    path = config.CSV_DIR / f"{module}.csv"
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for rec in records:
            writer.writerow({k: _flatten(v) for k, v in rec.items()})


def _flatten(value):
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return value


def append_error(url: str, reason: str) -> None:
    config.ERRORS_FILE.parent.mkdir(parents=True, exist_ok=True)
    errors = []
    if config.ERRORS_FILE.exists():
        errors = json.loads(config.ERRORS_FILE.read_text(encoding="utf-8"))
    errors.append({"url": url, "reason": reason})
    config.ERRORS_FILE.write_text(json.dumps(errors, ensure_ascii=False, indent=2), encoding="utf-8")


@dataclass
class Progress:
    done: list[str] = field(default_factory=list)

    @classmethod
    def load(cls) -> "Progress":
        if config.PROGRESS_FILE.exists():
            data = json.loads(config.PROGRESS_FILE.read_text(encoding="utf-8"))
            return cls(done=data.get("done", []))
        return cls()

    def mark_done(self, module: str) -> None:
        if module not in self.done:
            self.done.append(module)

    def is_done(self, module: str) -> bool:
        return module in self.done

    def save(self) -> None:
        config.PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
        config.PROGRESS_FILE.write_text(
            json.dumps({"done": self.done}, ensure_ascii=False, indent=2), encoding="utf-8"
        )

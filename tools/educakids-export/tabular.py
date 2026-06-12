"""Convert downloaded .xls exports into clean tabular records (list[dict])."""
from pathlib import Path

import xlrd


def xls_to_records(path: Path, header_row: int = 0) -> list[dict]:
    """Read the first sheet of an .xls file into a list of dict rows.

    header_row: the 0-based row index holding column names.
    """
    book = xlrd.open_workbook(str(path))
    sheet = book.sheet_by_index(0)
    if sheet.nrows <= header_row:
        return []
    headers = [str(sheet.cell_value(header_row, c)).strip() or f"col{c}"
               for c in range(sheet.ncols)]
    records: list[dict] = []
    for r in range(header_row + 1, sheet.nrows):
        row = {headers[c]: sheet.cell_value(r, c) for c in range(sheet.ncols)}
        if any(str(v).strip() for v in row.values()):
            records.append(row)
    return records

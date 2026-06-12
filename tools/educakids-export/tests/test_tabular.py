import tabular


class _FakeSheet:
    def __init__(self, rows):
        self._rows = rows
        self.nrows = len(rows)
        self.ncols = len(rows[0]) if rows else 0

    def cell_value(self, r, c):
        return self._rows[r][c]


class _FakeBook:
    def __init__(self, sheet):
        self._s = sheet

    def sheet_by_index(self, i):
        return self._s


def test_xls_to_records_maps_headers(monkeypatch):
    sheet = _FakeSheet([["Nom", "Age"], ["Ali", 5], ["Sara", 6]])
    monkeypatch.setattr(tabular.xlrd, "open_workbook", lambda p: _FakeBook(sheet))
    recs = tabular.xls_to_records("x")
    assert recs == [{"Nom": "Ali", "Age": 5}, {"Nom": "Sara", "Age": 6}]


def test_xls_to_records_empty(monkeypatch):
    sheet = _FakeSheet([["Nom", "Age"]])
    monkeypatch.setattr(tabular.xlrd, "open_workbook", lambda p: _FakeBook(sheet))
    assert tabular.xls_to_records("x") == []

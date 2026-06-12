import binaries


def test_collect_binary_urls_finds_img_and_pdf():
    records = [
        {"photo": "/files/1.jpg", "doc": "/files/1.pdf", "name": "x"},
    ]
    urls = binaries.collect_binary_urls(records, fields=["photo", "doc"])
    assert "/files/1.jpg" in urls
    assert "/files/1.pdf" in urls


def test_safe_filename_strips_path():
    assert binaries.safe_filename("https://x/a/b/photo.jpg") == "photo.jpg"


def test_safe_filename_falls_back_when_empty():
    assert binaries.safe_filename("https://x/") == "file.bin"


def test_safe_filename_includes_query_for_uniqueness():
    a = binaries.safe_filename("https://x/downloadactivitypdf?id=37850&batchid=714")
    b = binaries.safe_filename("https://x/downloadactivitypdf?id=37849&batchid=714")
    assert a != b
    assert "37850" in a and "37849" in b


def test_sniff_extension_detects_types():
    assert binaries._sniff_extension(b"%PDF-1.4 ...") == ".pdf"
    assert binaries._sniff_extension(b"PK\x03\x04zip") == ".xlsx"
    assert binaries._sniff_extension(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1xls") == ".xls"
    assert binaries._sniff_extension(b"<html><table>") == ".html"
    assert binaries._sniff_extension(b"\x00\x01rawbytes") == ""


def test_clean_content_strips_leading_blank_lines():
    assert binaries._clean_content(b"\r\n\r\n\r\nPK\x03\x04") == b"PK\x03\x04"


def test_find_export_endpoints_matches_export_like_routes():
    site_map = {
        "pages": {
            "https://admin.educakids.tn/ExportExcel": {},
            "https://admin.educakids.tn/DemoExportStudent": {},
            "https://admin.educakids.tn/fileDownloadCaisse": {},
            "https://admin.educakids.tn/telechargercirculaire": {},
            "https://admin.educakids.tn/downloadactivitypdf": {},
            "https://admin.educakids.tn/student": {},
            "https://admin.educakids.tn/index": {},
        }
    }
    found = binaries.find_export_endpoints(site_map)
    assert "https://admin.educakids.tn/ExportExcel" in found
    assert "https://admin.educakids.tn/DemoExportStudent" in found
    assert "https://admin.educakids.tn/fileDownloadCaisse" in found
    assert "https://admin.educakids.tn/telechargercirculaire" in found
    assert "https://admin.educakids.tn/downloadactivitypdf" in found
    assert "https://admin.educakids.tn/student" not in found
    assert "https://admin.educakids.tn/index" not in found

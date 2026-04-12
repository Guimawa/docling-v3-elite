from datetime import date

from core.db_product_utils import (
    _escape_like,
    _infer_supplier_geo,
    _parse_date,
    _product_key,
    _safe_float,
)


def test_parse_date_keeps_current_formats():
    assert _parse_date("24/10/2023") == date(2023, 10, 24)
    assert _parse_date("2023-10-24") == date(2023, 10, 24)
    assert _parse_date("24.10.2023") == date(2023, 10, 24)


def test_product_key_normalizes_text():
    product = {
        "fournisseur": "BigMat Barcelona",
        "designation_raw": "CIMENT 42.5R",
        "unite": "sac",
    }
    assert _product_key(product) == "bigmat-barcelona::ciment-42-5r::sac"


def test_infer_supplier_geo_returns_city_match():
    city, country, lat, lng, geohash, confidence = _infer_supplier_geo("BigMat Barcelona")
    assert city == "Barcelona"
    assert country == "ES"
    assert lat is not None and lng is not None
    assert geohash
    assert confidence == "medium"


def test_safe_float_and_escape_like():
    assert _safe_float("€ 12,50") == 12.50
    assert _safe_float("N/A") == 0.0
    assert _escape_like(r"a%b_c") == r"a\%b\_c"

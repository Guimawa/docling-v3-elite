"""Tests unitaires — utils.serializers."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from utils.serializers import _serialize_val, serialize_row


def test_serialize_none():
    assert _serialize_val(None) is None


def test_serialize_uuid():
    u = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
    assert _serialize_val(u) == "550e8400-e29b-41d4-a716-446655440000"


def test_serialize_bool_distinct_from_int():
    assert _serialize_val(True) is True
    assert _serialize_val(False) is False
    assert _serialize_val(1) == 1


def test_serialize_date_datetime():
    assert _serialize_val(date(2026, 3, 22)) == "2026-03-22"
    dt = datetime(2026, 3, 22, 14, 30, 5)
    assert _serialize_val(dt) == dt.isoformat()


def test_serialize_decimal_as_string_preserves_precision():
    assert _serialize_val(Decimal("99.995")) == "99.995"


def test_serialize_primitives():
    assert _serialize_val(42) == 42
    assert _serialize_val(3.14) == 3.14
    assert _serialize_val("x") == "x"


def test_serialize_nested_dict_and_list():
    d = {
        "d": date(2025, 1, 1),
        "nested": {"amt": Decimal("10.50"), "ids": [uuid.UUID(int=0), None]},
        "arr": [{"t": datetime(2025, 6, 15, 12, 0, 0)}],
    }
    out = _serialize_val(d)
    assert out["d"] == "2025-01-01"
    assert out["nested"]["amt"] == "10.50"
    assert out["nested"]["ids"][0] == "00000000-0000-0000-0000-000000000000"
    assert out["nested"]["ids"][1] is None
    assert out["arr"][0]["t"].startswith("2025-06-15")


def test_serialize_tuple_as_list():
    assert _serialize_val((1, Decimal("2"))) == [1, "2"]


def test_serialize_row_copy_and_none():
    row = {"a": 1, "b": date(2024, 1, 2)}
    out = serialize_row(row)
    assert out == {"a": 1, "b": "2024-01-02"}
    assert row["b"] == date(2024, 1, 2)

    assert serialize_row(None) == {}

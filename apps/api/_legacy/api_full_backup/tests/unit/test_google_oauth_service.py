"""google_oauth_service — JWT d'état sans DB."""

import time

import jwt

from services.auth_service import JWT_ALGORITHM, _get_jwt_secret
from services.google_oauth_service import (
    create_oauth_state_token,
    new_oauth_jti,
    verify_oauth_state_token,
)


def test_oauth_state_roundtrip() -> None:
    jti = new_oauth_jti()
    tok = create_oauth_state_token(jti)
    out = verify_oauth_state_token(tok)
    assert out == jti


def test_oauth_state_invalid_signature() -> None:
    jti = new_oauth_jti()
    tok = create_oauth_state_token(jti)
    parts = tok.split(".")
    assert len(parts) == 3
    bad = ".".join([parts[0], parts[1], "aaaa"])
    assert verify_oauth_state_token(bad) is None


def test_oauth_state_wrong_typ_claim() -> None:
    now = time.time()
    bad = jwt.encode(
        {"jti": "x", "iat": int(now), "exp": int(now) + 600, "typ": "other"},
        _get_jwt_secret(),
        algorithm=JWT_ALGORITHM,
    )
    assert verify_oauth_state_token(bad) is None

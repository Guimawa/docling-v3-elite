import pytest
from pydantic import ValidationError

from domains.community.router import CommunityPreferencesPatch
from domains.platform.router import WebVitalsPayload


def test_community_preferences_patch_accepts_valid_payload():
    payload = CommunityPreferencesPatch(community_consent=True, zone_geo="ES-CAT")
    assert payload.community_consent is True
    assert payload.zone_geo == "ES-CAT"


def test_community_preferences_patch_rejects_invalid_zone():
    with pytest.raises(ValidationError):
        CommunityPreferencesPatch(community_consent=True, zone_geo="@@invalid@@")


def test_web_vitals_payload_accepts_expected_fields():
    payload = WebVitalsPayload(name="LCP", value=1450.0, rating="good", path="/scan")
    assert payload.name == "LCP"
    assert payload.rating == "good"


def test_web_vitals_payload_rejects_invalid_metric_name():
    with pytest.raises(ValidationError):
        WebVitalsPayload(name="LCP metric", value=1450.0, rating="good")

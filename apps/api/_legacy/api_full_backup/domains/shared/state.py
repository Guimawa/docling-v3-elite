"""État process-wide minimal pour l'accès invité (FREE_ACCESS_MODE)."""

GUEST_USER_EMAIL = "guest@free.provisional"

guest_user_id: int | None = None


def set_guest_user_id(uid: int | None) -> None:
    global guest_user_id
    guest_user_id = uid


def get_guest_user_id() -> int | None:
    return guest_user_id

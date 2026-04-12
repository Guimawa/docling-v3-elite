"""Conftest racine apps/api — variables d'environnement communes à tous les tests."""

import os

os.environ.setdefault("JWT_SECRET", "test-secret-32-chars-minimum-for-pytest")

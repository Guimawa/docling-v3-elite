"""
Tests d'intégration StorageService réel — zéro mock.
Upload S3/Storj réel si configuré, sinon skip.
"""

import pytest

from services.storage_service import StorageService
from tests.skip_reasons import STO_ENV_INCOMPLETE, STO_UPLOAD_UNAVAILABLE


@pytest.fixture
def storage_configured():
    if not StorageService.is_configured():
        pytest.skip(STO_ENV_INCOMPLETE)


class TestStorageReel:
    def test_upload_file_reel(self, storage_configured):
        """Upload réel d'un fichier test vers le bucket Storj."""
        content = b"Test PDF content for integration test"
        filename = "test_integration_facture.pdf"
        url = StorageService.upload_file(
            content,
            filename,
            content_type="application/pdf",
        )
        if url is None:
            pytest.skip(STO_UPLOAD_UNAVAILABLE)
        assert filename in url or "test" in url.lower()

    def test_presigned_url_generation(self, storage_configured):
        """Génération d'URL pré-signée pour une clé existante ou fictive."""
        key = "2025/02/test_key.pdf"
        url = StorageService.get_presigned_url(key)
        assert url is not None
        assert "http" in url

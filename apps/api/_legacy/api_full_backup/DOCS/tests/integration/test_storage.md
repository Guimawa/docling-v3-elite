# test_storage.py — Ce qu'on vérifie

**Fichier :** `tests/integration/test_storage.py`
**Catégorie :** integration
**Ce qu'on teste :** Que le service de stockage cloud (Storj S3) fonctionne réellement — qu'on peut uploader un fichier vers le bucket distant et générer une URL d'accès valide.

---

## Le code

```python
"""
Tests d'intégration StorageService réel — zéro mock.
Upload S3/Storj réel si configuré, sinon skip.
"""


import pytest

from services.storage_service import StorageService


@pytest.fixture
def storage_configured():
    if not StorageService.is_configured():
        pytest.skip(
            "Storj non configuré — définir STORJ_ACCESS_KEY, STORJ_SECRET_KEY, STORJ_BUCKET"
        )


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
        assert url is not None
        assert filename in url or "test" in url.lower()

    def test_presigned_url_generation(self, storage_configured):
        """Génération d'URL pré-signée pour une clé existante ou fictive."""
        key = "2025/02/test_key.pdf"
        url = StorageService.get_presigned_url(key)
        assert url is not None
        assert "http" in url
```

---

## Ce que ces tests vérifient — en clair

### La fixture `storage_configured`

Avant d'exécuter les tests, cette fixture vérifie que Storj est configuré (c'est-à-dire que les variables d'environnement `STORJ_ACCESS_KEY`, `STORJ_SECRET_KEY` et `STORJ_BUCKET` sont définies). Si ce n'est pas le cas, les tests sont **ignorés** (`pytest.skip`) avec un message explicatif.

C'est une bonne pratique : plutôt que de faire échouer les tests avec une erreur technique incompréhensible, on dit clairement "ce test nécessite une configuration externe, il n'est pas applicable dans cet environnement".

---

### `test_upload_file_reel`

Ce test effectue un vrai upload vers le service de stockage Storj S3.

**L'analogie :** C'est comme envoyer réellement une lettre à la poste (et pas juste simuler l'envoi avec un morceau de papier dans un tiroir). On veut savoir si la lettre arrive.

**Ce que le test fait :**
1. On prépare un contenu binaire (`b"Test PDF content for integration test"`) qui représente un fichier PDF minimal.
2. On appelle `StorageService.upload_file()` avec ce contenu, un nom de fichier, et le type MIME `application/pdf`.
3. On vérifie que la fonction retourne une URL (pas `None`).
4. On vérifie que l'URL contient soit le nom du fichier, soit le mot "test" — c'est une vérification minimale que l'URL pointe bien vers quelque chose lié à notre upload.

**Ce que ce test ne fait pas :** Il ne vérifie pas que le fichier est téléchargeable depuis cette URL. Il confirme seulement que l'upload a renvoyé quelque chose qui ressemble à une URL valide.

---

### `test_presigned_url_generation`

Ce test vérifie la génération d'URL pré-signées — un mécanisme de sécurité courant dans les services S3.

**C'est quoi une URL pré-signée ?**
Normalement, un fichier dans un bucket S3 est privé. Pour permettre à quelqu'un de le télécharger temporairement sans lui donner les clés d'accès, on génère une "URL pré-signée" : une URL avec une signature cryptographique qui expire après un certain temps (souvent 15 minutes ou 1 heure).

**Ce que le test fait :**
1. On fournit une clé de fichier fictive (`"2025/02/test_key.pdf"`) — ce fichier n'a pas forcément besoin d'exister pour générer l'URL.
2. On appelle `StorageService.get_presigned_url()`.
3. On vérifie que le résultat est non-null et commence par `"http"`.

C'est un test de génération, pas d'accès réel. Il vérifie que le service est capable de calculer une URL signée, sans vérifier que cette URL fonctionne réellement.

---

## Pourquoi c'est important

Storj S3 est l'endroit où toutes les factures PDF des artisans sont archivées. C'est une dépendance externe critique.

Sans ces tests :
- Un changement de configuration (nouvelles clés d'accès, bucket renommé, région modifiée) pourrait casser silencieusement l'upload. Les artisans pourraient scanner des factures qui sembleraient traitées mais ne seraient jamais archivées.
- Une incompatibilité de version de la bibliothèque S3 (boto3) passerait inaperçue jusqu'en production.
- La génération d'URL pré-signées pourrait retourner des URLs malformées, rendant les factures inaccessibles depuis l'interface.

Ces tests constituent une vérification de "la tuyauterie fonctionne" pour le stockage cloud.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- Le skip automatique est élégant et informatif.
- Tester le vrai service (pas un mock) donne une vraie confiance sur le fonctionnement en production.
- La séparation en deux tests distincts (upload vs URL pré-signée) est claire.

**Améliorations possibles :**

1. **Le fichier uploadé n'est jamais supprimé.** Chaque exécution des tests laisse un fichier `test_integration_facture.pdf` dans le bucket Storj. Au fil du temps, cela pollue le bucket de production avec des fichiers de test. Il faudrait ajouter une étape de nettoyage (`StorageService.delete_file(filename)`) avec `try/finally`.

2. **L'assertion sur l'URL est trop permissive.** `filename in url or "test" in url.lower()` est vraie pour presque n'importe quelle URL contenant le mot "test". On devrait vérifier que l'URL est bien formée avec un domaine Storj reconnu (par exemple, `assert "storjshare.io" in url or "storj.io" in url`).

3. **`test_presigned_url_generation` utilise une clé fictive de 2025.** Si ce test tourne en 2026+, la clé `"2025/02/test_key.pdf"` ne correspond à aucun fichier réel. Le test vérifie seulement que la fonction ne plante pas, pas que l'URL générée est utilisable.

4. **Aucun test du cas d'erreur.** Que se passe-t-il si le bucket est plein ? Si les clés d'accès sont expirées ? Si le réseau est coupé ? Ces scénarios mériteraient d'être testés pour vérifier que les erreurs sont bien propagées (et pas silencieusement avalées).

5. **Le test `test_upload_file_reel` ne vérifie pas le téléchargement.** Upload + re-download constituerait un test d'intégration complet. Actuellement, on sait que l'upload "semble" fonctionner, mais pas qu'il est réellement lisible ensuite.

# test_upload_validation.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_upload_validation.py`
**Catégorie :** api
**Ce qu'on teste :** La validation des fichiers envoyés à l'API d'extraction de factures : rejet des fichiers trop lourds, des mauvais types de fichier et des fichiers vides.

---

## Le code

```python
"""
Tests API — validation upload (taille, MIME, fichier vide).
"""


def test_upload_too_large_returns_413(authenticated_client):
    """Upload d'un fichier trop grand (> 50 Mo) → 413 Request Entity Too Large."""
    client, _ = authenticated_client
    big_content = b"x" * (51 * 1024 * 1024)
    files = {"file": ("large.pdf", big_content, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 413


def test_upload_wrong_mime_type(authenticated_client):
    """Upload d'un fichier avec mauvais type MIME → 415 ou 422."""
    client, _ = authenticated_client
    files = {"file": ("script.exe", b"MZ\x00\x00", "application/octet-stream")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code in (415, 422, 400)


def test_upload_empty_file(authenticated_client):
    """Upload d'un fichier vide → 422 ou 400."""
    client, _ = authenticated_client
    files = {"file": ("empty.pdf", b"", "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code in (422, 400)
```

---

## Ce que ces tests vérifient — en clair

**`test_upload_too_large_returns_413`**
C'est comme une enveloppe trop lourde à La Poste : si le fichier dépasse 50 Mo, le serveur doit refuser immédiatement avec le code 413 ("Payload Too Large"), sans même tenter de lire le contenu. Cela protège le serveur contre la saturation mémoire.

Note : ce test existe aussi dans `test_invoices.py` (`test_process_file_too_large_413`). Les deux tests sont identiques — c'est une duplication.

**`test_upload_wrong_mime_type`**
C'est comme essayer d'envoyer un fichier `.exe` (programme Windows) déguisé en facture : le serveur doit détecter que ce n'est pas un format accepté (PDF ou image) et refuser. Le test utilise un vrai header MIME `application/octet-stream` et les premiers octets `MZ\x00\x00` qui sont la signature d'un exécutable Windows. L'API doit retourner 415 ("Unsupported Media Type"), 422, ou 400.

**`test_upload_empty_file`**
C'est comme envoyer une enveloppe vide : le fichier s'appelle `empty.pdf` et a un bon type MIME, mais son contenu est vide (0 octet). Le serveur doit refuser (422 ou 400) plutôt que de tenter une extraction sur un fichier sans données.

---

## Pourquoi c'est important

La validation des uploads est une ligne de défense essentielle :

- **Sécurité** : accepter des `.exe` ou des fichiers binaires inconnus pourrait ouvrir des vecteurs d'attaque (si le contenu est ensuite transmis à Gemini ou stocké sur S3 sans vérification).
- **Robustesse** : sans limite de taille, un seul upload de 500 Mo pourrait saturer la mémoire du serveur et le faire planter pour tous les utilisateurs.
- **Qualité des données** : un fichier vide ne peut pas être extrait — lancer Gemini dessus serait un appel API payant pour rien.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- Upload d'un fichier avec l'extension `.pdf` mais qui est en réalité une image JPEG (détection magic bytes vs extension).
- Upload d'une image JPEG ou PNG valide (si ce format est accepté en plus du PDF).
- Upload d'un PDF protégé par mot de passe.
- Upload de plusieurs fichiers en une seule requête (si l'API le supporte).
- La limite exacte de taille : que se passe-t-il avec exactement 50 Mo (limite) vs 50 Mo + 1 octet ?

**Tests fragiles :**
- `test_upload_wrong_mime_type` accepte trois codes (415, 422, 400), ce qui indique une incertitude sur le comportement exact. Idéalement, un seul code devrait être attendu — 415 est le plus approprié pour un mauvais type MIME.
- `test_upload_empty_file` accepte 422 ou 400 pour la même raison.

**Duplication avec `test_invoices.py` :**
- `test_upload_too_large_returns_413` est identique à `test_process_file_too_large_413` dans `test_invoices.py`. L'un des deux devrait être supprimé pour éviter la maintenance double.

**Manques évidents :**
- Pas de test de validation du nom de fichier (caractères spéciaux, chemin de traversal comme `../../etc/passwd`).
- Pas de test pour un PDF corrompu (header PDF valide mais contenu tronqué).

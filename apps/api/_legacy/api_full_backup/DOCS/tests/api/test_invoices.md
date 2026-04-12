# test_invoices.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_invoices.py`
**Catégorie :** api
**Ce qu'on teste :** L'upload de factures PDF et le suivi de l'état de traitement (job asynchrone) : acceptation de l'upload, rejet des fichiers trop lourds, gestion des jobs inexistants, et polling jusqu'à la fin du traitement.

---

## Le code

```python
"""
Tests API — extraction factures (process, status).
"""

import time


def test_process_returns_202_and_job_id(authenticated_client):
    """Upload minimal PDF → 202 + job_id."""
    client, _ = authenticated_client
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n%%EOF"
    files = {"file": ("test.pdf", pdf_bytes, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 202
    body = resp.json()
    assert "job_id" in body
    assert body.get("status") == "processing"


def test_process_file_too_large_413(authenticated_client):
    """Fichier > 50 Mo → 413."""
    client, _ = authenticated_client
    big_content = b"x" * (51 * 1024 * 1024)
    files = {"file": ("huge.pdf", big_content, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 413


def test_status_404_for_invalid_job_id(authenticated_client):
    client, _ = authenticated_client
    resp = client.get("/api/v1/invoices/status/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_status_polling_until_complete(authenticated_client):
    """Upload PDF minimal, poll jusqu'à completed ou error."""
    client, _ = authenticated_client
    pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n%%EOF"
    files = {"file": ("poll_test.pdf", pdf_bytes, "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp = client.post("/api/v1/invoices/process", files=files, data=data)
    assert resp.status_code == 202
    job_id = resp.json()["job_id"]

    for _ in range(60):
        status_resp = client.get(f"/api/v1/invoices/status/{job_id}")
        assert status_resp.status_code == 200
        data = status_resp.json()
        if data["status"] in ("completed", "error"):
            assert "status" in data
            break
        time.sleep(1)
    else:
        raise AssertionError("Job non terminé après 60s")
```

---

## Ce que ces tests vérifient — en clair

**`test_process_returns_202_and_job_id`**
C'est comme déposer un colis à La Poste et recevoir un numéro de suivi. On envoie un PDF minimal à l'API, et on vérifie : le serveur accepte immédiatement (code 202 = "reçu, je traite en arrière-plan") et fournit un `job_id` — l'identifiant unique pour suivre l'avancement du traitement. Le statut doit être `"processing"` à ce stade.

**`test_process_file_too_large_413`**
C'est comme essayer de poster une boîte de 100 kg alors que la limite est 50 kg : la Poste refuse. Un fichier de 51 Mo dépasse la limite fixée à 50 Mo, et le serveur doit répondre 413 ("Payload Too Large") sans même tenter de traiter le fichier.

**`test_status_404_for_invalid_job_id`**
C'est comme chercher un numéro de suivi qui n'existe pas : on demande l'état du job `00000000-0000-0000-0000-000000000000` (un UUID nul qui n'existe dans aucune base), et le serveur doit répondre 404 ("non trouvé").

**`test_status_polling_until_complete`**
C'est le test le plus réaliste : on simule exactement ce que fait l'interface mobile. On envoie une facture, on récupère le `job_id`, puis on interroge toutes les secondes l'état du traitement jusqu'à ce qu'il soit terminé (`"completed"`) ou en erreur (`"error"`). Le test lève une exception si au bout de 60 secondes le traitement n'est pas terminé — ce qui indiquerait un blocage ou une régression dans le pipeline de traitement.

---

## Pourquoi c'est important

Ces tests couvrent le cœur de l'application : l'upload et le traitement des factures est la fonctionnalité principale de Docling. Sans ces tests :
- On pourrait introduire une régression qui fait que l'upload ne retourne plus de `job_id`, bloquant toute l'interface.
- On pourrait supprimer accidentellement la limite de taille et permettre l'upload de fichiers de plusieurs gigaoctets, saturant la mémoire du serveur.
- On pourrait casser le suivi de statut sans s'en rendre compte, laissant les utilisateurs sans retour sur l'état de leur traitement.
- On pourrait introduire un bug qui fait que le traitement ne se termine jamais (`"processing"` en permanence).

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- Upload d'une vraie facture BIGMAT (il y en a 134 dans `PDF Test/`) pour vérifier que l'extraction IA fonctionne de bout en bout.
- Upload d'un PDF protégé par mot de passe.
- Upload d'une image JPEG ou PNG (si l'API le supporte).
- Le comportement lorsque le service Gemini est indisponible : le job passe-t-il en `"error"` avec un message clair ?
- La récupération des résultats après `"completed"` : on sait que le job est fini, mais on ne vérifie pas que les données extraites sont bien récupérables.

**Tests fragiles :**
- `test_status_polling_until_complete` peut être lent (jusqu'à 60 secondes) et est sensible à la disponibilité de l'API Gemini. Si Gemini est lent, le test peut échouer par timeout alors que l'application fonctionne correctement.
- Le PDF minimal utilisé (`b"%PDF-1.4..."`) est volontairement vide/invalide. Gemini va probablement retourner une erreur d'extraction — le test accepte `"error"` comme état final, ce qui est correct mais ne valide pas le cas de succès réel.

**Manques évidents :**
- Pas de test de la liste des jobs d'un utilisateur (si cet endpoint existe).
- Pas de test de l'annulation d'un job en cours.
- Pas de test de la limite du nombre de jobs simultanés.

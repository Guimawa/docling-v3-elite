# test_isolation.py — Ce qu'on vérifie

**Fichier :** `tests/security/test_isolation.py`
**Catégorie :** security
**Ce qu'on teste :** L'isolation multi-tenant — qu'un utilisateur ne puisse jamais accéder aux données d'un autre utilisateur (protection IDOR : Insecure Direct Object Reference).

---

## Le code

```python
"""
Tests de sécurité — isolation multi-tenant (IDOR).
User A ne doit JAMAIS accéder aux données de User B.
"""

import uuid

import httpx
import pytest
from faker import Faker

fake = Faker("fr_FR")

pytestmark = [pytest.mark.security]


def test_user_isolation_job_invisible_to_other_user(
    ensure_server_running: str,
    unique_user: dict,
):
    """
    user1 crée un job (scan), user2 ne doit PAS le voir.
    Assertion critique : isolation multi-tenant sur jobs.
    """
    import random
    import secrets

    base_url = ensure_server_running

    # User 1 : inscription + login
    client1 = httpx.Client(base_url=base_url, timeout=30)
    reg1 = client1.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    assert reg1.status_code in (200, 409)
    login1 = client1.post(
        "/api/v1/auth/login",
        data={"email": unique_user["email"], "password": unique_user["password"]},
    )
    assert login1.status_code == 200
    token1 = login1.json().get("token")
    assert token1
    client1.headers["Authorization"] = f"Bearer {token1}"

    # User 2 : création d'un second utilisateur
    pwd2 = f"Test@{secrets.token_hex(8)}!{random.randint(100, 999)}"
    user2 = {
        "email": f"test_{uuid.uuid4().hex[:8]}@{fake.domain_name()}",
        "password": pwd2,
        "name": fake.first_name(),
    }
    client2 = httpx.Client(base_url=base_url, timeout=30)
    client2.post(
        "/api/v1/auth/register",
        data={
            "email": user2["email"],
            "password": user2["password"],
            "name": user2.get("name", ""),
        },
    )
    login2 = client2.post(
        "/api/v1/auth/login",
        data={"email": user2["email"], "password": user2["password"]},
    )
    assert login2.status_code == 200
    token2 = login2.json().get("token")
    client2.headers["Authorization"] = f"Bearer {token2}"

    # User 1 : crée un job (upload minimal pour déclencher create_job)
    files = {"file": ("test.pdf", b"%PDF-1.4 minimal", "application/pdf")}
    data = {"model": "gemini-3-flash-preview", "source": "pc"}
    resp1 = client1.post("/api/v1/invoices/process", files=files, data=data)
    assert resp1.status_code == 202
    job_id = resp1.json().get("job_id")
    assert job_id

    # User 2 : tente d'accéder au job de user1 → 404 (CRITIQUE)
    resp2 = client2.get(f"/api/v1/invoices/status/{job_id}")
    assert resp2.status_code == 404, "user2 ne doit PAS voir le job de user1"

    # User 1 : peut voir son propre job
    resp1_status = client1.get(f"/api/v1/invoices/status/{job_id}")
    assert resp1_status.status_code == 200

    client1.close()
    client2.close()
```

---

## Ce que ces tests vérifient — en clair

**`test_user_isolation_job_invisible_to_other_user`**
C'est comme tester que dans un immeuble de bureaux, un locataire du 3ème étage ne peut pas ouvrir les tiroirs du locataire du 5ème même s'il connaît le numéro du tiroir.

Le scénario complet :
1. L'utilisateur 1 (Alice) crée un compte et se connecte.
2. L'utilisateur 2 (Bob) crée un compte différent et se connecte.
3. Alice envoie une facture PDF et obtient un `job_id` (ex: `abc-123`).
4. Bob essaie d'accéder à l'état de ce job en utilisant directement l'identifiant `abc-123`.
5. **Le serveur doit retourner 404 à Bob** — comme si ce job n'existait pas pour lui.
6. Alice, elle, peut toujours voir son propre job (200).

Ce type d'attaque s'appelle IDOR (Insecure Direct Object Reference) : c'est l'une des vulnérabilités OWASP les plus courantes. Un attaquant qui connaît ou devine un `job_id` (les UUIDs sont prévisibles si le générateur est faible) pourrait accéder aux factures confidentielles d'autres artisans.

---

## Pourquoi c'est important

Ce test est marqué "assertion critique" dans le code, et pour de bonnes raisons. Dans le contexte BTP :
- Les factures contiennent des informations commerciales sensibles : prix d'achat réels, fournisseurs, remises négociées.
- Dans un environnement multi-artisan, chaque artisan doit avoir accès uniquement à ses propres données.
- Une faille IDOR permettrait à un artisan concurrent de consulter les prix d'achat de ses concurrents.

Sans ce test, un développeur pourrait accidentellement oublier d'ajouter le filtre `WHERE user_id = :current_user` dans une requête SQL, rendant tous les jobs visibles à tous les utilisateurs connectés.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- L'isolation sur l'historique : Bob peut-il voir l'historique des factures d'Alice via `/history` ?
- L'isolation sur les produits du catalogue : les produits sont-ils partagés entre utilisateurs ou isolés par artisan ? Ce comportement devrait être testé explicitement.
- La modification de données d'un autre utilisateur : Bob peut-il modifier ou supprimer un job d'Alice (pas seulement le lire) ?
- L'accès au PDF archivé d'une facture d'un autre utilisateur via `/history/{id}/pdf`.
- L'énumération : si Bob essaie `job_id - 1` ou `job_id + 1` (si les IDs sont séquentiels), peut-il tomber sur le job de quelqu'un d'autre ?

**Tests fragiles :**
- Le test crée deux vrais utilisateurs dans la base. Si la base n'est pas nettoyée entre les tests, ces utilisateurs s'accumulent. Le test ne fait pas de nettoyage (DELETE) des comptes créés.
- Le `job_id` est récupéré depuis la réponse — si l'API change de format et ne retourne plus `job_id` à la racine du JSON, le test échouerait sur `assert job_id` avant même d'atteindre la vérification d'isolation.

**Duplication :**
- Ce test est quasiment identique à `test_user_isolation_job_invisible_to_other_user` dans `test_safe_helpers.py`. La seule différence est que dans `test_safe_helpers.py`, l'upload n'envoie pas les champs `model` et `source`. Cette duplication devrait être consolidée.

# test_reset_admin.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_reset_admin.py`
**Catégorie :** api
**Ce qu'on teste :** La protection de l'opération de reset du catalogue, qui supprime toutes les données — on s'assure qu'elle est inaccessible sans les bonnes autorisations et sans confirmation explicite.

---

## Le code

```python
"""
Tests API — reset catalogue (admin uniquement).
"""

import httpx


def test_reset_without_confirm_400(http_client: httpx.Client):
    resp = http_client.delete("/api/v1/catalogue/reset")
    assert resp.status_code in (400, 403)


def test_reset_without_admin_token_403(ensure_server_running: str, unique_user: dict):
    """Sans token admin, même avec confirm → 403."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        data={"email": unique_user["email"], "password": unique_user["password"]},
    )
    token = login.json().get("token")
    client.headers["Authorization"] = f"Bearer {token}"
    resp = client.delete(
        "/api/v1/catalogue/reset",
        params={"confirm": "SUPPRIMER_TOUT"},
    )
    assert resp.status_code == 403
    client.close()


def test_reset_with_confirm_but_no_token_400(ensure_server_running: str):
    """Confirm sans token → 400 (manque confirm) ou 403."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.delete(
        "/api/v1/catalogue/reset",
        params={"confirm": "SUPPRIMER_TOUT"},
    )
    assert resp.status_code in (400, 403)
    client.close()
```

---

## Ce que ces tests vérifient — en clair

**`test_reset_without_confirm_400`**
C'est comme un gros bouton rouge "TOUT EFFACER" dans une salle des serveurs : si on l'effleure accidentellement sans avoir dit le mot de passe de sécurité, rien ne se passe. Ici, appeler `DELETE /catalogue/reset` sans le paramètre de confirmation doit retourner une erreur (400 ou 403), pas déclencher la suppression.

**`test_reset_without_admin_token_403`**
C'est comme un employé normal qui essaie d'accéder à la salle du directeur avec sa propre carte badge — même s'il dit le bon mot de code, sa carte n'a pas les droits suffisants. Un utilisateur normal (non-admin), même authentifié et même avec le paramètre `confirm: "SUPPRIMER_TOUT"`, doit recevoir un refus (403 = "Forbidden"). Ce test est crucial : il vérifie que la protection par rôle admin fonctionne réellement.

**`test_reset_with_confirm_but_no_token_400`**
C'est comme crier le mot de code depuis la rue sans être entré dans le bâtiment : connaître la phrase de confirmation (`"SUPPRIMER_TOUT"`) sans être connecté du tout ne doit rien faire. L'API doit refuser (400 ou 403).

---

## Pourquoi c'est important

Le reset du catalogue est une opération **irréversible** : elle supprime tous les produits enregistrés. Si cette protection était défaillante :
- Un utilisateur mal intentionné ou simplement maladroit pourrait effacer tout le catalogue de prix en quelques secondes.
- Une requête automatique (bot, script) envoyée sans token pourrait déclencher le reset.
- Un utilisateur normal (artisan) pourrait accidentellement vider la base partagée.

Ces tests protègent contre ce scénario catastrophe en vérifiant les trois barrières de sécurité : authentification, autorisation (rôle admin) et confirmation explicite.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- Le cas de succès : on ne teste jamais qu'un vrai admin peut effectivement faire le reset. Sans ce test, on ne sait pas si l'opération fonctionne du tout quand les conditions sont réunies.
- La valeur de `confirm` incorrecte : que se passe-t-il avec `confirm: "oui"` ou `confirm: "delete"` plutôt que `"SUPPRIMER_TOUT"` ? L'API doit refuser aussi.
- La sensibilité à la casse : `confirm: "supprimer_tout"` (minuscules) est-il accepté ou refusé ?

**Tests fragiles :**
- `test_reset_without_confirm_400` et `test_reset_with_confirm_but_no_token_400` acceptent deux codes différents (400 ou 403), ce qui signifie qu'on n'est pas sûr du comportement attendu. Idéalement, chaque cas devrait avoir un seul code attendu.

**Manques évidents :**
- Pas de test avec un vrai token admin → on ne peut pas certifier que le reset fonctionne correctement dans les bonnes conditions.
- Pas de vérification que les données sont effectivement supprimées après un reset admin réussi.
- Pas de test de la journalisation de cette action critique (est-ce qu'un log est créé quand un admin fait un reset ?).

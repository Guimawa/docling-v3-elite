# test_injection.py — Ce qu'on vérifie

**Fichier :** `tests/security/test_injection.py`
**Catégorie :** security
**Ce qu'on teste :** Que des tentatives d'injection SQL et XSS dans les champs du catalogue ne compromettent pas la base de données ni ne permettent l'exécution de code malveillant.

---

## Le code

```python
"""
Tests de sécurité — injection SQL, XSS sur catalogue/batch.
"""

import pytest

pytestmark = [pytest.mark.security]


SQL_PAYLOADS = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT null,username,password FROM users--",
    "admin'--",
    "' OR 1=1--",
]


XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "<svg onload=alert(1)>",
]


@pytest.mark.parametrize("payload", SQL_PAYLOADS)
def test_sql_injection_batch_designation_raw(
    authenticated_client,
    payload,
):
    """Payload SQL dans designation_raw → stocké tel quel ou rejeté, pas d'exécution."""
    import uuid
    client, _ = authenticated_client
    marker = f"sql_test_{uuid.uuid4().hex[:6]}"
    products = [
        {
            "fournisseur": marker,
            "designation_raw": payload[:100],
            "designation_fr": "Produit test",
            "famille": "Autre",
            "prix_brut_ht": 10.0,
            "prix_remise_ht": 10.0,
            "prix_ttc_iva21": 12.1,
            "confidence": "high",
        },
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    # Soit 200 (données échappées et stockées comme texte), soit 500 (erreur)
    assert resp.status_code in (200, 500)
    if resp.status_code == 200:
        cat = client.get("/api/v1/catalogue")
        assert cat.status_code == 200


@pytest.mark.parametrize("payload", XSS_PAYLOADS)
def test_xss_batch_stored_sanitized(
    authenticated_client,
    payload,
):
    """Payload XSS dans designation_fr → stocké, pas exécuté côté serveur."""
    import uuid
    client, _ = authenticated_client
    marker = f"xss_test_{uuid.uuid4().hex[:6]}"
    products = [
        {
            "fournisseur": marker,
            "designation_raw": f"raw_{payload[:20].replace('<', '').replace('>', '')}",
            "designation_fr": payload,
            "famille": "Autre",
            "prix_brut_ht": 10.0,
            "prix_remise_ht": 10.0,
            "prix_ttc_iva21": 12.1,
            "confidence": "high",
        },
    ]
    resp = client.post(
        "/api/v1/catalogue/batch",
        json={"produits": products, "source": "pc"},
    )
    assert resp.status_code == 200
    # Les données sont stockées ; l'échappement JSON côté API évite l'injection
    # dans la réponse. Pas d'exécution de script côté serveur.
```

---

## Ce que ces tests vérifient — en clair

**`test_sql_injection_batch_designation_raw` (5 variantes)**
C'est comme tester qu'une serrure résiste à 5 types de crochets différents. Chaque payload SQL est une technique d'attaque classique :

- `' OR '1'='1` : tente de contourner une condition WHERE pour retourner tous les résultats.
- `'; DROP TABLE users; --` : la fameuse attaque "Bobby Tables" — tente de supprimer une table entière.
- `1' UNION SELECT null,username,password FROM users--` : tente d'extraire les mots de passe depuis la table `users`.
- `admin'--` : tente de se connecter en commentant la vérification du mot de passe.
- `' OR 1=1--` : variante simple pour tout débloquer.

Le test vérifie que l'application ne plante pas de façon catastrophique et que le catalogue reste accessible après l'envoi de ces données. L'assertion `in (200, 500)` est volontairement large : on accepte que le serveur retourne une erreur 500 (ce qui serait quand même un problème), mais on refuse tout comportement SQL exécuté (ex: la table `users` ne doit pas être supprimée).

**`test_xss_batch_stored_sanitized` (4 variantes)**
C'est comme tester qu'un forum de discussion n'exécute pas les scripts que les utilisateurs postent. Les payloads XSS (Cross-Site Scripting) sont des bouts de HTML/JavaScript malveillants :

- `<script>alert('xss')</script>` : la forme la plus directe.
- `<img src=x onerror=alert(1)>` : déclenche JavaScript via une erreur de chargement d'image.
- `javascript:alert(1)` : protocole JavaScript dans une URL.
- `<svg onload=alert(1)>` : vecteur SVG.

Le test vérifie que l'API accepte ces données (code 200) sans les exécuter côté serveur. La logique est : le serveur Python ne va pas exécuter du JavaScript — la vraie protection XSS doit être assurée par le frontend (React) qui échappe les données avant de les afficher.

---

## Pourquoi c'est important

Ces deux types d'attaque sont dans le Top 10 OWASP (les 10 vulnérabilités web les plus critiques) :

- **Injection SQL** : si les requêtes SQL sont construites par concaténation de chaînes plutôt que par requêtes paramétrées, un attaquant peut lire, modifier ou supprimer toute la base de données. Dans le contexte BTP avec des prix fournisseurs, cela peut représenter une fuite de données commerciales sensibles.
- **XSS stocké** : si un script malveillant est sauvegardé en base et affiché à d'autres utilisateurs, il s'exécute dans leur navigateur — pouvant voler leurs cookies, leurs tokens ou effectuer des actions en leur nom.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- L'injection SQL dans les paramètres de requête GET (ex: `?famille=' OR '1'='1`).
- L'injection dans les champs de connexion (email/password).
- Le XSS réfléchi (dans les paramètres de recherche retournés dans la réponse).
- L'injection de templates (SSTI — Server-Side Template Injection).
- La vérification que les données XSS stockées sont bien échappées lorsqu'elles sont relues depuis la base (et pas seulement que le serveur n'exécute pas de JS).

**Tests fragiles :**
- `test_sql_injection_batch_designation_raw` accepte le code 500 comme résultat valide, ce qui masque un vrai bug — une injection qui fait planter le serveur est une vulnérabilité de déni de service (DoS).
- Les payloads XSS ne vérifient pas que les données sont correctement échappées dans les réponses GET suivantes. On pourrait lire le catalogue après insertion pour s'assurer que `<script>` est retourné comme texte et non comme tag HTML.

**Manques évidents :**
- Pas de nettoyage des données insérées dans ces tests — les payloads SQL et XSS restent en base après le test, polluant le catalogue.
- Les payloads sont limités : il en existe des centaines de variantes. Une bibliothèque dédiée comme `sqlmap` ou des listes OWASP plus complètes donneraient une meilleure couverture.

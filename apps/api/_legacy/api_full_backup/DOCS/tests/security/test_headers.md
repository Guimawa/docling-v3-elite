# test_headers.py — Ce qu'on vérifie

**Fichier :** `tests/security/test_headers.py`
**Catégorie :** security
**Ce qu'on teste :** La présence d'en-têtes HTTP de sécurité dans les réponses de l'API, qui protègent les navigateurs contre certaines attaques courantes.

---

## Le code

```python
"""
Tests de sécurité — en-têtes HTTP.
"""

import httpx


def test_health_response_headers(ensure_server_running: str):
    """Vérifie la présence d'en-têtes de sécurité sur /health."""
    client = httpx.Client(base_url=ensure_server_running, timeout=10)
    resp = client.get("/health")
    assert resp.status_code == 200
    headers = resp.headers
    # Documenter les headers présents/absents
    # FastAPI ne met pas tous ces headers par défaut
    if "X-Content-Type-Options" in headers:
        assert headers["X-Content-Type-Options"] == "nosniff"
    if "X-Frame-Options" in headers:
        assert "DENY" in headers["X-Frame-Options"] or "SAMEORIGIN" in headers["X-Frame-Options"]
    # Content-Type JSON
    assert "application/json" in headers.get("content-type", "")
    client.close()
```

---

## Ce que ces tests vérifient — en clair

**`test_health_response_headers`**
Ce test vérifie deux choses :

1. **Le `Content-Type`** : l'API doit toujours répondre avec `application/json` pour ses endpoints JSON. C'est comme s'assurer qu'un restaurant qui vend des sandwichs ne vous donne pas accidentellement un menu de pizzas. Si ce header est absent ou incorrect, les navigateurs et les clients API peuvent interpréter la réponse de manière erronée.

2. **Les en-têtes de sécurité** (vérification conditionnelle) :
   - `X-Content-Type-Options: nosniff` — dit au navigateur "n'essaie pas de deviner le type de fichier, fais-moi confiance". Cela bloque une attaque où un navigateur tenterait d'exécuter un fichier JSON comme du JavaScript.
   - `X-Frame-Options: DENY ou SAMEORIGIN` — empêche cette page d'être chargée dans une `<iframe>` d'un autre site. Cela protège contre les attaques de type "clickjacking" où un site malveillant superposerait l'API sur une page pour tromper l'utilisateur.

La vérification est conditionnelle (`if "header" in headers`) — le test documente l'état des headers sans imposer leur présence obligatoire.

---

## Pourquoi c'est important

Les en-têtes de sécurité sont la première ligne de défense côté navigateur. Ils ne protègent pas le serveur lui-même, mais les utilisateurs qui consultent les données via un navigateur :
- Sans `X-Content-Type-Options`, un navigateur ancien pourrait interpréter une réponse JSON comme du HTML exécutable (MIME sniffing).
- Sans `X-Frame-Options`, un site malveillant pourrait intégrer l'API dans une page invisible et tromper un utilisateur pour qu'il clique sur des boutons sans le savoir (clickjacking).
- Sans `Content-Security-Policy`, un code JavaScript injecté dans une réponse pourrait s'exécuter dans le contexte de l'application.

---

## Peut-on améliorer ces tests ?

**Ce test est le plus faible du dossier `security/`** — les vérifications sont toutes conditionnelles, ce qui signifie que le test passe même si aucun en-tête de sécurité n'est présent. Il documente l'état des choses sans réellement les imposer.

**Cas non couverts :**
- `Content-Security-Policy` (CSP) — l'en-tête de sécurité le plus important, qui contrôle quelles ressources peuvent être chargées.
- `Strict-Transport-Security` (HSTS) — force l'utilisation de HTTPS.
- `Referrer-Policy` — contrôle les informations envoyées lors des redirections.
- `Permissions-Policy` (anciennement `Feature-Policy`) — limite l'accès aux API du navigateur.
- La vérification sur d'autres endpoints (pas seulement `/health`) : les en-têtes sont-ils présents sur tous les endpoints ou seulement celui-là ?

**Tests fragiles :**
- Toutes les vérifications sont enveloppées dans des `if` — si les headers ne sont pas présents, le test passe sans signaler d'avertissement. Ce n'est pas vraiment un test de sécurité, c'est une documentation de l'état actuel.

**Comment vraiment améliorer :**
Les vérifications conditionnelles devraient devenir des assertions obligatoires :
```python
# Au lieu de :
if "X-Content-Type-Options" in headers:
    assert headers["X-Content-Type-Options"] == "nosniff"

# Devrait être :
assert "X-Content-Type-Options" in headers
assert headers["X-Content-Type-Options"] == "nosniff"
```
Cela force l'équipe à réellement configurer ces en-têtes (via un middleware FastAPI) et à maintenir cette configuration.

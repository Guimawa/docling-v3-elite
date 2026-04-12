# test_health.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_health.py`
**Catégorie :** api
**Ce qu'on teste :** Que l'application démarre correctement et répond sur ses deux endpoints de base : la racine `/` et le point de santé `/health`.

---

## Le code

```python
"""
Tests API — endpoints racine et health.
"""

import httpx


def test_root(http_client: httpx.Client):
    resp = http_client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "message" in data
    assert "Docling" in data["message"]
    assert "docs" in data
    assert "version" in data


def test_health(http_client: httpx.Client):
    resp = http_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
```

---

## Ce que ces tests vérifient — en clair

**`test_root`**
C'est comme sonner à la porte d'un bureau et vérifier qu'on répond "Ici Docling, version X, la documentation est ici". On s'assure que la page d'accueil de l'API répond (code 200), qu'elle mentionne bien "Docling" dans son message, et qu'elle indique où trouver la documentation ainsi que la version de l'API.

**`test_health`**
C'est comme un médecin qui vérifie les constantes vitales d'un patient : on demande à l'application comment elle se porte et elle doit répondre `"status": "ok"`. Ce type d'endpoint est aussi utilisé par les plateformes d'hébergement (Render dans ce projet) pour savoir si l'application est vivante et doit recevoir du trafic.

---

## Pourquoi c'est important

Ces deux tests sont les plus fondamentaux de toute la suite :
- Si `/` ne répond pas, l'application n'est tout simplement pas démarrée. Ces tests servent de "smoke test" — si ça échoue, inutile de continuer.
- Le `/health` est un endpoint critique pour le déploiement : Render surveille cette URL pour décider si le container doit être redémarré. Si ce test échoue en production, l'application est considérée comme "morte" et les utilisateurs ne peuvent plus y accéder.
- La présence du champ `version` permet de détecter un déploiement raté (mauvaise version en production).

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- L'état de la connexion à la base de données : le `/health` retourne "ok" même si la base Neon est injoignable ? Idéalement, un health check devrait inclure l'état de la DB.
- L'état des services externes (Storj S3, Gemini) : un health check enrichi pourrait signaler que l'IA ou le stockage est hors-ligne.
- Le contenu exact du champ `version` : on vérifie juste qu'il existe, mais pas qu'il correspond à la version réelle du code déployé.

**Tests fragiles :**
- `test_root` vérifie que `"Docling"` est dans le message. Si le message change de formulation un jour (ex: "Bienvenue sur l'API Docling"), le test passe toujours. Mais si on renomme le projet, le test casse sans raison fonctionnelle.

**Manques évidents :**
- Pas de vérification du temps de réponse : un `/health` qui prend 10 secondes est un problème même s'il retourne 200.
- Pas de test du lien vers la documentation (`docs`) : on vérifie que la clé existe mais pas que l'URL est accessible.
- Un test `/health` devrait idéalement vérifier la connectivité base de données (`db: "ok"`) pour être vraiment utile en production.

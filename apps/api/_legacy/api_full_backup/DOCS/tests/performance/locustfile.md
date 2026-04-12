# locustfile.py — Ce qu'on vérifie

**Fichier :** `tests/performance/locustfile.py`
**Catégorie :** performance
**Ce qu'on teste :** Comment l'API se comporte quand plusieurs utilisateurs l'utilisent simultanément — simulation de charge réaliste avec de vrais utilisateurs virtuels qui naviguent, consultent et créent des données en parallèle.

---

## Le code

```python
"""
Load testing — simulation utilisateurs réels.
Lancer : locust -f tests/06_performance/locustfile.py --host=http://localhost:8000
"""

import uuid

from faker import Faker
from locust import HttpUser, between, task

fake = Faker("fr_FR")


class DoclingUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        self.email = f"load_{uuid.uuid4().hex[:8]}@test.com"
        self.password = f"Load@{uuid.uuid4().hex[:6]}!1"
        self.client.post(
            "/api/v1/auth/register",
            data={"email": self.email, "password": self.password, "name": fake.first_name()},
        )
        resp = self.client.post(
            "/api/v1/auth/login",
            data={"email": self.email, "password": self.password},
        )
        if resp.status_code == 200:
            self.token = resp.json().get("token")
            self.client.headers["Authorization"] = f"Bearer {self.token}"

    @task(5)
    def catalogue_list(self):
        self.client.get("/api/v1/catalogue?limit=20", name="/api/v1/catalogue [list]")

    @task(3)
    def stats(self):
        self.client.get("/api/v1/stats", name="/api/v1/stats")

    @task(2)
    def fournisseurs(self):
        self.client.get("/api/v1/catalogue/fournisseurs", name="/api/v1/catalogue/fournisseurs")

    @task(1)
    def batch_save(self):
        products = [
            {
                "fournisseur": f"Load_{uuid.uuid4().hex[:6]}",
                "designation_raw": fake.catch_phrase()[:80],
                "designation_fr": fake.catch_phrase()[:80],
                "famille": "Autre",
                "prix_brut_ht": 10.0,
                "prix_remise_ht": 10.0,
                "prix_ttc_iva21": 12.1,
                "confidence": "high",
            },
        ]
        self.client.post(
            "/api/v1/catalogue/batch",
            json={"produits": products, "source": "pc"},
            name="/api/v1/catalogue/batch [create]",
        )
```

---

## Ce que ces tests vérifient — en clair

### Ce qu'est Locust et pourquoi c'est différent des autres tests

Locust n'est pas un test pytest classique qu'on lance avec `pytest`. C'est un outil de **test de charge** qu'on lance séparément avec la commande :

```bash
locust -f tests/performance/locustfile.py --host=http://localhost:8000
```

Il ouvre alors une interface web (par défaut sur `http://localhost:8089`) où on peut configurer combien d'utilisateurs virtuels simuler et à quelle vitesse les faire démarrer.

**L'analogie :** Les tests pytest, c'est comme tester qu'une porte s'ouvre bien quand on appuie sur la poignée. Locust, c'est comme simuler 200 personnes qui essaient d'entrer par la même porte en même temps — et observer ce qui se passe.

---

### La classe `DoclingUser`

Chaque "utilisateur virtuel" que Locust crée est une instance de la classe `DoclingUser`. Voici ce qu'elle représente :

**`wait_time = between(1, 3)`**
Entre chaque action, l'utilisateur attend entre 1 et 3 secondes. C'est une simulation du comportement humain : personne ne clique en continu à 1000 requêtes par seconde — il y a des pauses naturelles entre les actions.

---

### `on_start` — La phase de démarrage

Quand un utilisateur virtuel démarre, il exécute `on_start` une seule fois. C'est comme le moment où un artisan ouvre l'application pour la première fois dans sa session :

1. **Il crée un compte** avec un email unique (`load_xxxx@test.com`) et un mot de passe. L'UUID garantit que chaque utilisateur virtuel a son propre compte et ne crée pas de conflit avec les autres.

2. **Il se connecte.** Si la connexion réussit, il récupère le token JWT et l'ajoute à tous ses futurs appels via l'en-tête `Authorization: Bearer ...`.

**Note :** Si le login échoue (serveur trop chargé, rate limiting déclenché), `self.token` reste `None` et toutes les requêtes suivantes seront non-authentifiées. Cela peut révéler des problèmes de rate limiting trop agressif sous charge.

---

### Les `@task` — Ce que l'utilisateur fait

Chaque méthode marquée `@task(N)` représente une action que l'utilisateur peut effectuer. Le chiffre entre parenthèses est un **poids** — il définit la probabilité relative que cette action soit choisie.

**Distribution des actions :**
| Action | Poids | Fréquence relative |
|--------|-------|-------------------|
| Consulter le catalogue | 5 | 45% des actions |
| Voir les statistiques | 3 | 27% des actions |
| Lister les fournisseurs | 2 | 18% des actions |
| Sauvegarder un produit | 1 | 9% des actions |

Cette distribution reflète le comportement réel attendu : les utilisateurs consultent bien plus souvent qu'ils ne créent. Neuf consultations pour une écriture, c'est un ratio réaliste pour ce type d'application.

**`@task(5) catalogue_list`** : C'est la route la plus sollicitée. L'artisan consulte régulièrement son catalogue de prix pour préparer un devis.

**`@task(3) stats`** : Consultation du tableau de bord des statistiques — moins fréquent que la liste.

**`@task(2) fournisseurs`** : Consultation de la liste des fournisseurs — un filtre ou une navigation.

**`@task(1) batch_save`** : Création d'un nouveau produit avec des données générées aléatoirement par `Faker`. C'est l'action la plus "coûteuse" pour le serveur (écriture en base), donc la moins fréquente dans la simulation.

---

### `fake = Faker("fr_FR")`

La bibliothèque `Faker` génère des données aléatoires réalistes en français. `fake.catch_phrase()` produit des phrases du style "Mobilité optimisée multi-couches" — pas des vrais noms de produits BTP, mais des chaînes de caractères de longueur réaliste pour simuler la charge.

---

## Pourquoi c'est important

Les tests unitaires et d'intégration vérifient que le code fonctionne correctement. Les tests de charge Locust vérifient qu'il **tient** sous pression.

Des problèmes qu'on ne peut découvrir qu'avec un test de charge :

- **Fuites de connexions DB :** Après 1000 requêtes, le pool de connexions PostgreSQL est épuisé. Les nouvelles requêtes attendent indéfiniment. L'application semble "gelée".
- **Dégradation progressive :** Les 100 premières requêtes prennent 200ms. La 500e prend 2 secondes. La 1000e prend 10 secondes. Une fuite mémoire ou un cache mal géré peut produire cet effet.
- **Rate limiting trop agressif :** Si le rate limiter (slowapi) bloque les utilisateurs légitimes dès 50 requêtes en 10 secondes, Locust le révèle immédiatement par un taux d'erreur 429.
- **Contention sur la base de données :** Plusieurs utilisateurs qui écrivent simultanément peuvent créer des conflits de verrous en PostgreSQL.
- **Comportement du load balancer :** Sur Render (l'hébergement), si plusieurs instances de l'API tournent, Locust peut révéler des incohérences si l'état est mal partagé entre instances.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- La distribution des tâches par poids reflète un usage réaliste.
- Chaque utilisateur virtuel a son propre compte UUID — pas de conflits entre utilisateurs.
- `Faker("fr_FR")` génère des données localisées, cohérentes avec le contexte BTP français.
- Le `wait_time = between(1, 3)` simule un comportement humain réaliste.

**Améliorations possibles :**

1. **Les comptes créés pendant le test de charge ne sont jamais supprimés.** Après un test de 10 minutes avec 100 utilisateurs virtuels, la base contient 100 comptes `load_xxxx@test.com` et des milliers de produits `Load_xxxx`. Il faudrait une étape de nettoyage (`on_stop`) ou utiliser une base de données dédiée aux tests de charge.

2. **Le token JWT peut expirer pendant un long test.** Si le test dure plus longtemps que la durée de vie du token (typiquement 15 à 60 minutes), les requêtes commencent à échouer avec des 401. Il faudrait gérer le renouvellement du token dans `on_start` ou ajouter une tâche `@task` de refresh.

3. **Aucune vérification du contenu des réponses.** Locust mesure si les requêtes réussissent (code HTTP 2xx), mais ne vérifie pas que le corps de la réponse est correct. Sous forte charge, une API peut répondre 200 avec un corps vide ou une erreur JSON masquée.

4. **Les données des produits créés sont irréalistes.** `fake.catch_phrase()` produit "Mobilité optimisée multi-couches" — pas "CIMENT 42.5R sac 25kg". Pour tester des scénarios plus réalistes, on pourrait utiliser une liste prédéfinie de vrais noms de produits BTP.

5. **Pas de scénario de scan de facture.** La route d'upload et d'OCR (`/api/v1/factures/upload`) est absente de la simulation. C'est pourtant la route la plus lourde du système (appel Gemini AI + traitement image). Son absence donne une image incomplète des performances réelles.

6. **Le fichier indique `tests/06_performance/locustfile.py` dans le commentaire** alors que le fichier est en `tests/performance/locustfile.py`. Ce chemin obsolète peut induire en erreur.

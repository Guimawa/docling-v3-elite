# community_service.py — La base de prix partagée et anonyme entre utilisateurs

**Fichier :** `apps/api/services/community_service.py`
**Rôle :** Collecter les prix des factures de tous les utilisateurs de façon anonyme, et permettre de consulter des statistiques de prix par région et fournisseur — sans jamais révéler qui a acheté quoi.

---

## Le code

```python
"""
CommunityService — Base prix communautaire anonyme
Collecte et agrégation des prix avec k-anonymité.
"""

import hashlib
import logging
import re
import unicodedata
from typing import Any

import asyncpg

from core.config import Config
from core.db_manager import _escape_like

logger = logging.getLogger(__name__)

K_ANONYMITY_MIN = 5


def _normalize(s: str) -> str:
    """Normalise pour regroupement : minuscules, trim, suppression accents."""
    if not s:
        return ""
    s = str(s).strip().lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s)
    return s


def _hash_produit(designation: str, fournisseur: str) -> str:
    """Hash irréversible pour regroupement anonyme."""
    salt = Config.COMMUNITY_SALT or "docling-default-salt"
    norm = _normalize(designation or "") + "|" + _normalize(fournisseur or "")
    return hashlib.sha256((salt + norm).encode()).hexdigest()


class CommunityService:
    @classmethod
    async def insert_anonymous_prices_batch(
        cls,
        conn: asyncpg.Connection,
        rows: list[dict],
        zone_geo: str,
        pays: str,
    ) -> int:
        """Batch insert de prix anonymes en une seule requête SQL.

        Chaque élément de `rows` doit contenir :
          - designation (str)
          - fournisseur (str)
          - prix_ht (float)
          - date_facture (str | None)

        Retourne le nombre de lignes insérées.
        """
        if not Config.COMMUNITY_SALT:
            return 0
        if not zone_geo or not pays or len(pays) != 2:
            return 0
        if not rows:
            return 0
        records = []
        for p in rows:
            ph = _hash_produit(p.get("designation", ""), p.get("fournisseur", ""))
            records.append((
                ph,
                (p.get("fournisseur") or "")[:200],
                zone_geo[:10],
                pays[:2],
                float(p.get("prix_ht") or 0),
                p.get("date_facture"),
            ))
        try:
            await conn.executemany(
                """
                INSERT INTO prix_anonymes (produit_hash, fournisseur, zone_geo, pays, prix_ht, date_facture)
                VALUES ($1, $2, $3, $4, $5, $6::date)
                """,
                records,
            )
            return len(records)
        except Exception as e:
            logger.warning("Community batch insert failed: %s", e)
            return 0

    @classmethod
    async def get_stats(
        cls,
        zone: str | None = None,
        pays: str | None = None,
        fournisseur: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Agrégats avec k-anonymité (COUNT >= 5)."""
        pool = await cls._get_pool()
        conditions = []
        params: list[Any] = []
        idx = 1
        if zone:
            conditions.append(f"p.zone_geo = ${idx}")
            params.append(zone)
            idx += 1
        if pays:
            conditions.append(f"p.pays = ${idx}")
            params.append(pays[:2])
            idx += 1
        if fournisseur:
            conditions.append(f"p.fournisseur ILIKE ${idx} ESCAPE E'\\\\'")
            params.append(f"%{_escape_like(fournisseur)}%")
            idx += 1
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        having_idx = idx
        limit_idx = idx + 1
        params.extend([K_ANONYMITY_MIN, limit])

        async with pool.acquire() as conn:
            rows = await conn.fetch(
                f"""
                WITH agg AS (
                    SELECT
                        produit_hash,
                        fournisseur,
                        zone_geo,
                        pays,
                        AVG(prix_ht) AS prix_moyen,
                        MIN(prix_ht) AS prix_min,
                        MAX(prix_ht) AS prix_max,
                        COUNT(*) AS cnt
                    FROM prix_anonymes p
                    {where}
                    GROUP BY produit_hash, fournisseur, zone_geo, pays
                    HAVING COUNT(*) >= ${having_idx}
                )
                SELECT produit_hash, fournisseur, zone_geo, pays,
                       prix_moyen, prix_min, prix_max, cnt AS nb_contributions
                FROM agg
                ORDER BY nb_contributions DESC
                LIMIT ${limit_idx}
                """,
                *params,
            )
        return [dict(r) for r in rows]

    @classmethod
    async def _get_pool(cls):
        from core.db_manager import DBManager
        return await DBManager.get_pool()
```

---

## Ce que ce fichier fait — en clair

### L'analogie du baromètre de prix

Imagine que tous les artisans d'une région partagent leurs prix d'achat dans un grand tableau commun, mais sans mettre leur nom dessus. Au final, n'importe quel artisan peut consulter le tableau et voir : "Pour des parpaings chez ce fournisseur en Catalogne, le prix moyen est de 0,85 €/pièce". C'est exactement ce que fait ce service — une base de prix collaborative et anonyme.

### `K_ANONYMITY_MIN = 5` — La règle des 5

Ce chiffre est au cœur de la confidentialité du système. Un résultat ne sera jamais affiché s'il repose sur moins de 5 contributions différentes. Si seulement 3 personnes ont acheté un produit particulier, les statistiques ne seront pas visibles — car avec si peu de données, on pourrait potentiellement identifier qui a acheté quoi. C'est ce qu'on appelle la "k-anonymité" : garantir qu'au moins k personnes partagent la même information avant de la rendre visible.

### `_normalize()` — Le niveleur de texte

```python
def _normalize(s: str) -> str:
```

Avant de comparer ou regrouper des produits, il faut s'assurer que "Ciment Portland", "ciment portland", "CIMENT  PORTLAND" et "ciment portlánd" sont reconnus comme le même produit. Cette fonction fait exactement ça :
- Elle met tout en minuscules.
- Elle supprime les espaces en trop.
- Elle enlève les accents (le "é" devient "e", le "à" devient "a").

Sans cette normalisation, "Ciment Portland" et "ciment portland" seraient considérés comme deux produits différents, et les statistiques seraient fragmentées.

### `_hash_produit()` — L'empreinte digitale anonyme

```python
def _hash_produit(designation: str, fournisseur: str) -> str:
```

Pour regrouper les entrées du même produit sans stocker son vrai nom dans la table communautaire, on calcule une "empreinte" mathématique unique à partir du nom normalisé et du fournisseur. C'est le principe du hachage cryptographique (SHA-256) : à partir de l'empreinte, il est impossible de retrouver le nom original.

Un "sel" (`COMMUNITY_SALT`) est ajouté avant le calcul. C'est une chaîne secrète connue uniquement par l'application. Sans ce sel, quelqu'un qui connaît le nom d'un produit pourrait calculer son empreinte et vérifier si ce produit est présent dans la base — ce qu'on veut empêcher.

Exemple : "ciment portland" chez "BIGMAT" → une longue suite de lettres et chiffres comme `a3f7b2...` qui ne révèle rien mais permet de regrouper toutes les contributions du même produit.

### `insert_anonymous_prices_batch()` — Ajouter des prix en masse

```python
async def insert_anonymous_prices_batch(cls, conn, rows, zone_geo, pays) -> int:
```

Quand une facture est traitée avec succès, cette méthode enregistre les prix dans la base communautaire. Elle prend une liste de produits et les insère tous d'un coup en base de données (c'est plus efficace qu'un insert par insert).

Elle commence par trois vérifications de sécurité :
- Si la clé secrète `COMMUNITY_SALT` n'est pas configurée, la fonction ne fait rien. Cela permet de désactiver la collecte communautaire simplement en ne définissant pas cette variable.
- Le code pays doit faire exactement 2 caractères (`FR`, `ES`) — c'est le format ISO standard.
- La liste de produits ne doit pas être vide.

Pour chaque produit, seul le hash est stocké dans la colonne `produit_hash` — jamais le vrai nom. Le nom du fournisseur, lui, est stocké en clair (tronqué à 200 caractères) car il est considéré comme une information non sensible (c'est un nom commercial).

### `get_stats()` — Consulter les statistiques

```python
async def get_stats(cls, zone=None, pays=None, fournisseur=None, limit=50) -> list:
```

C'est la fenêtre d'affichage du tableau commun. La requête SQL effectue quatre opérations :

1. **Filtre** (clause `WHERE`) : on peut filtrer par zone géographique, pays, et/ou fournisseur. Les filtres sont optionnels et se combinent.

2. **Regroupement** (clause `GROUP BY`) : toutes les entrées ayant le même hash produit, le même fournisseur, la même zone et le même pays sont regroupées ensemble.

3. **Agrégation** : pour chaque groupe, on calcule le prix moyen, le prix minimum, le prix maximum, et le nombre de contributions.

4. **Filtre k-anonymité** (clause `HAVING`) : seuls les groupes avec au moins 5 contributions sont retenus.

La protection contre les injections SQL (`ILIKE ... ESCAPE`) empêche un utilisateur malveillant d'injecter des caractères spéciaux dans le champ de recherche fournisseur pour manipuler la requête.

### `_get_pool()` — Accès à la base de données

Une petite méthode utilitaire qui récupère le "pool de connexions" à la base de données. L'import est fait à l'intérieur de la méthode (import tardif) pour éviter les imports circulaires entre modules.

---

## Peut-on optimiser ce fichier ?

**Ce qui est bien fait :**
- La k-anonymité utilise le seuil `Config.COMMUNITY_K_ANONYMITY_MIN` (env `COMMUNITY_K_ANONYMITY_MIN`, défaut 5, bornes 2–50).
- Le salt limite les attaques par dictionnaire sur les hashs produit.
- Insertion batch avec dédoublonnage optionnel : colonne `submission_fp` + index UNIQUE partiel `(submission_fp, produit_hash, prix_ht)` et `ON CONFLICT DO NOTHING` lorsque l’empreinte de soumission est fournie (orchestrateur : SHA-256 de `user_id|numéro|date|fichier`). Sans `submission_fp`, comportement inchangé (toutes les lignes insérées).
- Commentaire explicite sur la construction du `WHERE` dans `get_stats` : fragments = littéraux internes + `$n` ; entrées utilisateur uniquement via paramètres.
- Cache mémoire TTL ~60 s sur `get_stats`, clé `(zone, pays, fournisseur, limit)`, verrou asyncio (pas de blocage inter-requêtes hors section cache/lecture résultat).
- Docstring de module : compromis **fournisseur en clair** (filtres / UX stats) vs **produit hashé** (ré-identification possible si fournisseur très rare — à traiter au niveau conformité si besoin).

**Pistes restantes :**

1. **`get_stats()` n’expose toujours pas le libellé produit** : seul `produit_hash` est renvoyé — choix d’anonymat ; un affichage utile pourrait passer par des libellés agrégés ou une autre politique métier.

2. **Index partiel + `ON CONFLICT … WHERE`** : nécessite PostgreSQL 15+ pour l’inférence sur index partiel ; vérifier la version en production (Neon).

3. **Invalidation de cache** : non implémentée ; TTL seul suffit pour l’instant.

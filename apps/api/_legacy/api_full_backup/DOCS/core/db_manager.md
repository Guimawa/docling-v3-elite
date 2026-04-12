# db_manager.py — Le gestionnaire de la base de données

**Fichier :** `core/db_manager.py`
**Rôle :** Toutes les opérations de lecture et d'écriture dans la base PostgreSQL — une seule classe qui centralise tout.

---

## Le code

```python
"""
DBManager — Docling Agent v3
PostgreSQL Neon via asyncpg
- Cursor-based pagination (plus rapide et stable que OFFSET)
- Recherche floue pg_trgm sur designation_raw (CA/ES) + designation_fr (FR)
- Upsert anti-doublon sur (designation_raw, fournisseur)
- Thread-safe via connection pool (min 2, max 10)

Neon 2026 : utiliser l'URL avec -pooler (ex: ep-xxx-pooler.region.neon.tech)
pour PgBouncer → jusqu'à 10k connexions, meilleure résilience.
"""

import json
import logging
import re
from datetime import date, datetime
from typing import Any

import asyncpg

from core.config import Config

logger = logging.getLogger(__name__)

_UPSERT_SQL = """
    INSERT INTO produits (
        user_id, fournisseur, designation_raw, designation_fr,
        famille, unite,
        prix_brut_ht, remise_pct, prix_remise_ht, prix_ttc_iva21,
        numero_facture, date_facture, confidence, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (designation_raw, fournisseur, user_id)
    DO UPDATE SET
        designation_fr = EXCLUDED.designation_fr,
        famille        = EXCLUDED.famille,
        prix_brut_ht   = EXCLUDED.prix_brut_ht,
        remise_pct     = EXCLUDED.remise_pct,
        prix_remise_ht = EXCLUDED.prix_remise_ht,
        prix_ttc_iva21 = EXCLUDED.prix_ttc_iva21,
        numero_facture = EXCLUDED.numero_facture,
        date_facture   = EXCLUDED.date_facture,
        confidence     = EXCLUDED.confidence,
        source         = EXCLUDED.source,
        updated_at     = NOW()
"""
# ... [code complet dans le fichier source]
```

> Le fichier source complet : `apps/api/core/db_manager.py`

---

## Ce que ce fichier fait — en clair

C'est **le guichet unique** de toutes les données.
Tout ce qui entre ou sort de la base de données passe par ici.
Aucun autre fichier ne parle directement à PostgreSQL — ils passent tous par `DBManager`.

---

### Le pool de connexions — le standard téléphonique

Ouvrir une connexion à une base de données, c'est comme décrocher un téléphone pour appeler quelqu'un.
Ça prend du temps à établir. Si 100 personnes font une requête en même temps et qu'on ouvre 100 appels, le serveur sature.

Un **pool de connexions**, c'est comme avoir un standard téléphonique avec 10 lignes disponibles en permanence.
Quand une requête arrive, elle prend une ligne libre, s'en sert, et la repose pour la suivante.

```
min_size=2  → 2 lignes toujours ouvertes (même si personne ne l'utilise)
max_size=10 → jamais plus de 10 connexions simultanées
ssl="require" → connexion chiffrée obligatoire (Neon est dans le cloud)
```

Si toutes les lignes sont occupées, les nouvelles requêtes attendent patiemment au lieu de planter.

---

### Les 3 petites fonctions utilitaires du bas

Avant la classe principale, 3 fonctions d'aide qui nettoient les données avant de les stocker :

#### `_escape_like(term)` — le nettoyeur de recherche

Quand tu tapes `"20% remise"` dans une recherche, le `%` est un caractère spécial en SQL qui veut dire "n'importe quoi".
Cette fonction met un anti-slash devant pour dire "c'est un vrai pourcentage, pas un joker".

#### `_safe_float(val)` — le traducteur de prix

L'IA peut renvoyer des prix sous n'importe quelle forme : `"12,50"`, `"€45"`, `"N/A"`, `12.5`, `None`…
Cette fonction essaie de tout convertir en nombre décimal propre.
Si c'est impossible (texte bizarre), elle retourne `0.0` au lieu de planter.

#### `_parse_date(val)` — le traducteur de dates

Pareil pour les dates : la facture peut écrire `"25/01/2026"`, `"2026-01-25"`, `"25.01.26"`…
Cette fonction essaie 5 formats différents jusqu'à en trouver un qui marche.
Si aucun ne fonctionne, elle retourne `None` plutôt que de planter.

---

### `get_pool()` — ouvrir le standard

Crée le pool de connexions la première fois qu'on l'appelle.
Les fois suivantes, retourne le même (pas besoin d'en recréer un).
C'est le pattern **Singleton** : un seul pool pour toute l'application.

---

### `upsert_products_batch()` — le sauvegardeur intelligent

C'est la fonction la plus importante du fichier.
Elle prend une liste de produits extraits d'une facture et les sauvegarde tous.

**"Upsert"** = INSERT + UPDATE combiné :
- Si le produit n'existe pas encore → on l'ajoute
- S'il existe déjà (même nom, même fournisseur, même utilisateur) → on met à jour le prix

C'est comme tenir un carnet de prix : si tu vois un produit pour la première fois tu le notes, si tu le revois avec un nouveau prix tu effaces et tu réécris.

En parallèle, pour chaque produit avec un prix valide, elle insère une entrée dans `prix_historique` — le livre de bord des évolutions de prix.
Tout ça dans une seule **transaction** : soit tout passe, soit rien.

---

### `get_catalogue()` — le moteur de recherche du catalogue

La fonction la plus complexe. Elle permet de chercher dans les produits avec :
- un filtre par famille (béton, bois, acier…)
- un filtre par fournisseur
- une recherche textuelle floue (tu peux faire des fautes, ça trouve quand même)
- une **pagination curseur** pour les grandes listes

**Pagination curseur vs pagination classique :**
- Pagination classique (`OFFSET 50`) : "saute les 50 premiers résultats, donne-moi les suivants"
  → Problème : si quelqu'un ajoute un produit pendant que tu scrolles, les pages se décalent
- Pagination curseur : "donne-moi les produits mis à jour AVANT telle date/heure"
  → Stable et rapide même avec des millions de produits

La recherche floue utilise `similarity()` de PostgreSQL avec un score minimum de `0.2` :
si tu tapes "cimen" ça trouve "Ciment Portland 42.5" parce que la ressemblance est suffisante.
Les résultats sont triés par score de pertinence (le plus proche en premier).

---

### `get_stats()` — le tableau de bord

Compte en une seule requête :
- Combien de produits au total
- Combien de fournisseurs différents
- Combien de familles différentes
- Combien extraits avec une confiance faible (à vérifier manuellement)
- Combien envoyés depuis mobile
- Combien ajoutés cette semaine

---

### `compare_prices_with_history()` — le comparateur de prix

Cherche un produit et affiche son prix chez tous les fournisseurs + l'historique des prix.

**Optimisation anti-N+1 :** au lieu de faire une requête par produit pour récupérer son historique (ce qui ferait 20 requêtes pour 20 produits), cette fonction fait **2 requêtes total** :
1. Tous les produits qui correspondent à la recherche
2. Tout l'historique de tous ces produits en une seule fois

Puis elle assemble les données en mémoire. C'est 10x plus rapide.

---

### `log_facture()` — l'archiviste

Après chaque traitement, on enregistre une ligne dans `factures` :
- Quel fichier a été traité
- Est-ce que ça a réussi
- Combien de produits ont été extraits
- Combien ça a coûté en crédits Gemini
- Quel modèle IA a été utilisé

---

### Jobs — les tickets de suivi

3 fonctions pour gérer les traitements en arrière-plan :
- `create_job()` : crée un ticket quand on commence à traiter une facture
- `update_job()` : met à jour le ticket (en cours → terminé ou erreur)
- `get_job()` : retourne l'état d'un ticket (pour que le front puisse afficher "en cours…")

---

### `get_user_export_data()` — l'export RGPD

Retourne toutes les données d'un utilisateur (produits + factures).
Obligatoire légalement : tout utilisateur peut demander l'export de ses données.

---

## Optimisations appliquées (2026-03)

### 1. `get_catalogue()` — un aller-retour pour la page courante
Sous-requête scalaire `(SELECT COUNT(*)::bigint FROM produits WHERE <filtres sans curseur>)` dans le même `SELECT` que la page. Les filtres **recherche** (ILIKE + trigram) sont **alignés** entre total et liste (plus d’écart avec l’ancien `COUNT` simplifié). Si la page est vide, un second `COUNT` minimal peut être exécuté pour exposer le total.

### 2. `update_product()` — entrée validée + colonnes figées
Schéma Pydantic `CatalogueProductUpdate` (`schemas/invoice.py`) sur le endpoint ; en base, `_PATCHABLE_PRODUCT_COLUMNS` / `_NUMERIC_PRODUCT_COLUMNS` et boucle sur clés **triées** pour un SQL stable.

### 3. `get_stats()` — cache mémoire 60 s
TTL `_STATS_TTL_SEC = 60`, clé `(stats, user_id)` — par worker (pas de Redis requis).

### 4. `get_factures_history()` — une seule requête
`WHERE ($1::bigint IS NULL OR user_id = $1)` + `LIMIT $2`.

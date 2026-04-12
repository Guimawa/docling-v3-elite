-- =============================================================================
-- Docling — Complément catalogue (reporting / facettes prix)
-- =============================================================================
-- Contexte
--   Ce fichier est un **complément** au schéma versionné par Alembic (a001 → a013).
--   Il ne crée pas `public.produits` et ne doit pas dupliquer ce qu’Alembic applique
--   déjà de façon canonique.
--
-- Prérequis (obligatoire)
--   Table `public.produits` + révisions Alembic à jour, au minimum **a013** :
--     .\scripts\migrate_db.ps1
--   Sans cela : erreur « relation produits does not exist » ou colonnes manquantes.
--
-- Déjà couvert par Alembic — ne pas recréer ici (évite index GIN btree en double) :
--   a001 : `idx_produits_famille`, `idx_produits_fournisseur`, GIN `designation_fr`
--          (`idx_trgm_fr`), GIN `designation_raw`, index combiné recherche, …
--   a013 : colonnes `attributes`, `photo_url`, `description_ia`, adresse/tél/site
--          fournisseur, index GIN `idx_produits_attributes_gin`.
--
-- Apport spécifique de ce script
--   1. Index btree **partiel** sur `prix_remise_ht` (lignes à prix > 0) : filtres
--      catalogue / agrégations sans indexer les lignes à prix nul.
--   2. Vue matérialisée `produits_stats` + index unique pour
--      `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
--
-- Idempotence
--   `IF NOT EXISTS` : ré-exécution sûre après déploiements. Si la définition de la
--   MV doit changer, il faut `DROP MATERIALIZED VIEW` puis recréer (hors scope auto).
--
-- Exploitation production
--   Après import massif ou gros batch upsert :
--     REFRESH MATERIALIZED VIEW CONCURRENTLY public.produits_stats;
--   Planifier via pg_cron, job applicatif ou pipeline ETL ; éviter REFRESH bloquant
--   en heures de pointe si la MV est volumineuse.
--
-- Nettoyage (rollback manuel, commentaires uniquement)
--   DROP INDEX CONCURRENTLY IF EXISTS public.idx_produits_prix_remise_ht_positive;
--   DROP MATERIALIZED VIEW IF EXISTS public.produits_stats;
-- =============================================================================

SET search_path = public;

-- Index partiel : seulement les lignes avec prix catalogue utile
CREATE INDEX IF NOT EXISTS idx_produits_prix_remise_ht_positive
    ON public.produits (prix_remise_ht)
    WHERE prix_remise_ht > 0;

-- Agrégats par famille × fournisseur × sous_famille (champ JSONB `attributes`)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.produits_stats AS
SELECT
    p.famille,
    p.fournisseur,
    p.attributes ->> 'sous_famille' AS sous_famille,
    COUNT(*)::bigint AS nb_produits,
    MIN(p.prix_remise_ht) AS prix_min,
    MAX(p.prix_remise_ht) AS prix_max,
    ROUND(AVG(p.prix_remise_ht)::numeric, 4) AS prix_moy
FROM public.produits AS p
WHERE p.prix_remise_ht IS NOT NULL
  AND p.prix_remise_ht > 0
GROUP BY
    p.famille,
    p.fournisseur,
    (p.attributes ->> 'sous_famille');

COMMENT ON MATERIALIZED VIEW public.produits_stats IS
    'Agrégats prix par famille, fournisseur et sous_famille (JSON attributes). '
    'Rafraîchir avec REFRESH MATERIALIZED VIEW CONCURRENTLY public.produits_stats';

CREATE UNIQUE INDEX IF NOT EXISTS idx_produits_stats_pk
    ON public.produits_stats (famille, fournisseur, COALESCE(sous_famille, ''));

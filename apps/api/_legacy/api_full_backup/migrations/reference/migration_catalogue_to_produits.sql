-- =============================================================================
-- migration_catalogue_to_produits.sql — renommage table legacy « catalogue »
-- =============================================================================
-- Contexte prompt : remplacer la table catalogue par produits (SQL strict).
-- Bases Docling créées via Alembic a001 : la table s’appelle déjà « produits ».
-- Ce script est idempotent : il ne fait rien si « produits » existe ou si
-- « catalogue » est absent.
--
-- Ordre : exécuter sur Neon **avant** les ALTER JSONB / vues si vous migrez une
-- base tierce ; sinon **après** ``.\scripts\migrate_db.ps1`` (no-op).
-- =============================================================================

SET search_path = public;

DO $$
BEGIN
    IF to_regclass('public.catalogue') IS NOT NULL
       AND to_regclass('public.produits') IS NULL THEN
        ALTER TABLE public.catalogue RENAME TO produits;
        RAISE NOTICE 'Table catalogue renommée en produits.';
    ELSE
        RAISE NOTICE 'Aucun renommage (catalogue absent ou produits déjà présent).';
    END IF;
END $$;

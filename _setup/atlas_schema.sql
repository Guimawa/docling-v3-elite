-- CONFIGURATION ATLAS DOCLING V3 (ELITE)
-- Active l'extension PostGIS pour la géolocalisation
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Table des prix anonymisés
CREATE TABLE IF NOT EXISTS atlas_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name TEXT NOT NULL,
    unit_price_ht NUMERIC(10, 2) NOT NULL,
    unit_type TEXT NOT NULL,
    geopoint GEOGRAPHY(POINT, 4326), -- PostGIS pour la précision
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexation GIST pour des recherches ultra-rapides
CREATE INDEX IF NOT EXISTS idx_atlas_prices_geopoint ON atlas_prices USING GIST (geopoint);

-- 2. Fonction d'insertion ANONYME (Logiciel de confiance)
CREATE OR REPLACE FUNCTION insert_atlas_price(
    material_name TEXT,
    unit_price_ht NUMERIC,
    unit_type TEXT,
    lat NUMERIC,
    lon NUMERIC,
    obs_date TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
    INSERT INTO atlas_prices (material_name, unit_price_ht, unit_type, geopoint, observed_at)
    VALUES (
        material_name,
        unit_price_ht,
        unit_type,
        ST_SetSRID(ST_Point(lon, lat), 4326)::geography, -- Conversion coordonnées
        obs_date
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Fonction de recherche RADIALE (Géo-Intelligence)
CREATE OR REPLACE FUNCTION search_atlas_prices(
    search_query TEXT,
    user_lat NUMERIC,
    user_lon NUMERIC,
    radius_meters INT
) RETURNS TABLE (
    id UUID,
    material_name TEXT,
    unit_price_ht NUMERIC,
    distance_meters FLOAT,
    source_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.id,
        ap.material_name,
        ap.unit_price_ht,
        ST_Distance(ap.geopoint, ST_SetSRID(ST_Point(user_lon, user_lat), 4326)::geography) as distance_meters,
        ap.observed_at
    FROM atlas_prices ap
    WHERE ap.material_name ILIKE '%' || search_query || '%'
    AND ST_DWithin(ap.geopoint, ST_SetSRID(ST_Point(user_lon, user_lat), 4326)::geography, radius_meters)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

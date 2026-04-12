-- CONFIGURATION ATLAS DOCLING V3 (ELITE)
-- A exécuter dans le SQL Editor de Supabase

-- 1. Table Atlas des Prix (Anonyme)
CREATE TABLE IF NOT EXISTS atlas_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_name text NOT NULL,
  unit_price_ht decimal NOT NULL,
  unit text DEFAULT 'U',
  geopoint geometry(Point, 4326),
  source_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now()
);

-- Index Spatial pour les recherches de proximité
CREATE INDEX IF NOT EXISTS atlas_prices_geo_idx ON atlas_prices USING GIST (geopoint);

-- Index Trigram pour la recherche textuelle rapide (Google-style)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS atlas_prices_name_trgm_idx ON atlas_prices USING GIST (material_name gist_trgm_ops);

-- 2. Fonction d'insertion Anonyme (RPC)
-- Cette fonction garantit qu'aucun ID utilisateur n'est lié à la donnée.
CREATE OR REPLACE FUNCTION insert_atlas_price(
  material_name text,
  unit_price_ht decimal,
  unit_type text,
  lat double precision,
  lon double precision,
  obs_date date
)
RETURNS void AS $$
BEGIN
  INSERT INTO atlas_prices (material_name, unit_price_ht, unit, geopoint, source_date)
  VALUES (
    material_name, 
    unit_price_ht, 
    unit_type, 
    CASE 
      WHEN lat IS NOT NULL AND lon IS NOT NULL THEN ST_SetSRID(ST_Point(lon, lat), 4326)
      ELSE NULL 
    END,
    obs_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction de recherche Géo-localisée
CREATE OR REPLACE FUNCTION search_atlas_prices(
  search_query text,
  user_lat double precision,
  user_lon double precision,
  radius_meters integer DEFAULT 50000
)
RETURNS TABLE (
  id uuid,
  material_name text,
  unit_price_ht decimal,
  unit text,
  distance_meters float,
  source_date date
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id, 
    a.material_name, 
    a.unit_price_ht, 
    a.unit,
    ST_Distance(a.geopoint, ST_SetSRID(ST_Point(user_lon, user_lat), 4326)) as distance_meters,
    a.source_date
  FROM atlas_prices a
  WHERE 
    (search_query = '' OR a.material_name ILIKE '%' || search_query || '%')
    AND (user_lat IS NULL OR ST_DWithin(a.geopoint, ST_SetSRID(ST_Point(user_lon, user_lat), 4326), radius_meters))
  ORDER BY distance_meters ASC, source_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

# DATA MODEL — DOCLING V3 (ELITE)

## Équilibre entre Vie Privée et Intelligence Collective
Le modèle de données sépare strictement le **Vault** (Privé) de l'**Atlas** (Partagé).

## 1. Tables Principales (SQL)

### `profiles`
- `id` : uuid (primary key)
- `email` : text
- `full_name` : text
- `company_name` : text
- `location_preference` : point (PostGIS)
- `created_at` : timestamp

### `documents`
- `id` : uuid
- `owner_id` : uuid (references profiles)
- `type` : enum ('invoice', 'expense', 'admin', 'insurance')
- `r2_path` : text (chemin du fichier original)
- `status` : enum ('pending', 'processing', 'completed', 'error')
- `created_at` : timestamp

### `ocr_results`
- `id` : uuid
- `document_id` : uuid (references documents)
- `raw_json` : jsonb (Données complètes extraites par Gemini)
- `vendor_name` : text
- `total_ht` : decimal
- `total_tva` : decimal
- `total_ttc` : decimal
- `extracted_date` : date

### `atlas_prices` (Données Anonymisées)
- `id` : uuid
- `material_name` : text
- `unit_price_ht` : decimal
- `unit` : text (ex: 'm2', 'sac', 'kg')
- `geopoint` : geometry(Point, 4326)
- `source_date` : date

## 2. Relations
- Un `profile` possède plusieurs `documents`.
- Un `document` a un seul `ocr_result`.
- Un `ocr_result` peut générer plusieurs `atlas_prices` (un par ligne de facture).

## 3. Considérations RGPD
- Anonymisation irréversible des entrées de l'Atlas (suppression du lien vers `profile_id` ou `document_id`).
- Chiffrement des PDF sensibles dans R2.

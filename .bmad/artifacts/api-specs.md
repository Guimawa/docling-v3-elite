# API SPECS — DOCLING V3 (ELITE)

## Conventions
- **Base URL** : `https://api.docling.io/v1`
- **Auth** : Bearer Token (JWT via Better Auth)
- **Format** : JSON (UTF-8)

## 1. Endpoints de Capture

### `POST /capture/upload`
Envoie une image ou un PDF pour traitement.
- **Paramètres** : Image (Multipart/form-data), `lat`, `long` (optionnels).
- **Réponse 202 (Accepted)** : `{ "job_id": "uuid", "status": "processing" }`

### `GET /capture/status/{job_id}`
Vérifier l'état de l'extraction.
- **Réponse 200** : `{ "id": "uuid", "status": "completed", "result": { ... } }`

## 2. Endpoints du Vault

### `GET /documents`
Récupérer la liste des documents avec filtres par type/date.
- **Query Params** : `type`, `start_date`, `end_date`.

### `GET /documents/{id}`
Détails complets d'une facture et lien vers le fichier source (URL R2 signée).

## 3. Endpoints de l'Atlas

### `GET /atlas/search`
Recherche sémantique de prix.
- **Query Params** : `q` (texte ou transcript audio), `radius`, `lat`, `long`.
- **Réponse** : Liste d'objets `{ "material": "Ciment", "price_avg": 5.40, "trend": "up" }`

## 4. Endpoints du Pilot (IA)

### `POST /pilot/chat`
Interroger ses données en langage naturel.
- **Body** : `{ "message": "Combien j'ai dépensé chez Point.P ce mois-ci ?" }`
- **Réponse** : `{ "text": "Vous avez dépensé 1 240,50€ répartis sur 4 factures.", "ui_hint": "bar_chart" }`

## 5. Gestion des Erreurs
- `400` : Requête mal formée.
- `401` : Non autorisé.
- `429` : Too many requests (Rate limiting Gemini).
- `500` : Erreur serveur.

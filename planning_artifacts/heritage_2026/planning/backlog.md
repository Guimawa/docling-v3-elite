# Implementation Backlog: Docling MVP

## EPIC 1: Foundation & Shell
- **STORY 1.1**: Setup React Native Expo v52 project with NativeWind v5.
- **STORY 1.2**: Implementation of "Crystal Light" theme (Tokens, Variables, Typography).
- **STORY 1.3**: Supabase Auth Integration (Sign-In/Sign-Up for Artisans).
- **STORY 1.4**: Navigation architecture (Main Tab Bar: Scan, History, Community, Settings).

## EPIC 2: Elite Scanner (The AI Core)
- **STORY 2.1**: Camera interface with high-resolution capture and serial mode support.
- **STORY 2.2**: Integration of Gemini 3.1 Flash-Lite for on-device OCR.
- **STORY 2.3**: Implementation of "Quick-Swipe" validation UI.
- **STORY 2.4**: Local storage of captured images (Encrypted).

## EPIC 3: Data & Offline Architecture
- **STORY 3.1**: Local database setup (SQLite) for offline cost tracking.
- **STORY 3.2**: Background synchronization worker (Hono Worker).
- **STORY 3.3**: Sync Settings UI (Wi-Fi vs Cellular controls).
- **STORY 3.4**: Automatic job-site suggestion using GPS Geofencing.

## EPIC 4: Community Intelligence (MVP)
- **STORY 4.1**: Supplier identification logic (Logo + GPS POS matching).
- **STORY 4.2**: Data Anonymization layer for pricing contributions.
- **STORY 4.3**: Simple List View of community-shared price points by category.
## EPIC 5: Digital Ingestion (PDF & Web)
- **STORY 5.1**: Web Dashboard "Dropzone" for bulk PDF/Image uploads.
- **STORY 5.2**: Cloudflare Email Worker for automatic attachment extraction.
- **STORY 5.3**: PDF metadata parsing (Native text vs OCR fallback).
- **STORY 5.4**: History view for "Digital vs Scanned" document sources.

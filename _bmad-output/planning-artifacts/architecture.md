# 🏛️ ARCHITECTURE - DOCLING V3 (ÉLITE)

## 1. Physical Architecture (Elite Edge)
- **Runtime**: Cloudflare Workers.
- **Protocol**: HTTP/3, WebSocket for real-time Agentic UI updates.
- **Edge Deployment**: Geo-distributed for <3s latency global peak.

## 2. Component Diagram
- **Scanner Service**: Mobile-side processing (Auto-crop, Perspective Warp).
- **Inference Orchestrator**: Routing between Gemini 1.5 Flash (Fast extraction) and 3.1 Pro (Deep reasoning).
- **Storage Layer**: Dynamic adapter for R2 / GDrive / Dropbox.
- **Community Atlas**: Anonymized price data sync with Atlas Waze-BTP.

## 3. Data Flow
1. **Capture**: Image captured -> Local Hash -> Check for Duplicates.
2. **Pre-processing**: Perspective correction -> Compression.
3. **Extraction**: Edge Agent (Docling) -> Structured JSON with Bounding Boxes.
4. **Validation**: Aurora Web UI with Elite Zoom (Auto-positioning on source zone).
5. **Persistence**: Supabase RLS Protected.

## 4. Security Highlights
- **Anonymization**: PII (Personally Identifiable Information) stripped before Atlas contribution.
- **End-to-End Encryption**: Encrypted at rest on target storage.
- **RLS**: Row Level Security enforced on all Postgres queries.

## 5. Integration Points
- **IBM Docling**: Primary extraction engine.
- **Bmad Builder**: Dynamic widget generation.
- **WDS**: Semantic Design System tokens.

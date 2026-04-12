---
project_name: 'Docling (Pronto Module)'
user_name: 'Guimawa'
date: '2026-04-11'
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['Bmad/project-context.md', 'docs/PRODUCT-BRIEF.md']
classification:
  projectType: 'Collaborative Mobile-First Management App (OCR & Market Intelligence)'
  domain: 'BTP / Supply Chain / Fintech'
  complexity: 'High (AI Normalization, Geolocation, Privacy-First)'
  projectContext: 'Brownfield (Strategic pivot within Pronto Ecosystem)'
  philosophie: 'Silent AI Assistant (Non-invasive, User-controlled)'
workflowType: 'prd'
---

# Product Requirements Document: Docling (Pronto)

## Executive Summary
**Docling** is the intelligent pricing engine of the **PRONTO** ecosystem. It automates material price tracking and invoice OCR for BTP professionals, turning scattered paper receipts into a centralized, community-driven localized market atlas.

### Unique Value Proposition
- **The "Invisible Admin"**: Zero-entry data extraction using Gemini 3.1 Flash-Lite.
- **Pricing Sovereignty**: A "Bloomberg for Construction sites" where artisans regain power over supplier pricing through anonymized collective data.
- **Mission-Critical Reliability**: 100% offline-first edge architecture for functioning in white zones (basements, remote sites).

## Success Criteria

### User Excellence
- **Scan Speed**: Complete extraction and categorization in **< 3 seconds**.
- **Quote Efficiency**: Ability to generate on-site professional quotes in **< 2 minutes**.
- **Accuracy**: **< 5%** manual correction rate for AI-extracted line items.

### Business & Ecosystem
- **Community Growth**: Reach **1,000+** localized price points within 60 days.
- **Retention**: Average of **5+ scans per week** per active user.
- **Upsell**: 20% of Docling users activation of other Pronto modules within a month.

## Design & Experience Philosophy
- **The "Moment of Relief"**: Every scan must feel like a weight off the artisan's shoulders. Feedback should be sensory (haptic/audio) and immediate.
- **Active-Work UI**: High-contrast "Crystal Light" theme with **> 60px** touch targets for use with soiled or gloved hands.
- **Silent Guidance**: The AI only interrupts when it detects a significant pricing anomaly or a budget overrun.

## User Journeys

### Journey 1: The "Dashboard Capture" (Marc, Mason)
Marc snaps a crumpled delivery note while still in his truck. Docling uses GPS to auto-link it to the "Rue de la Paix" site. The data is structured before he puts the truck in gear.

### Journey 2: The "Live Quote" Adjustment
While estimating an add-on on-site, Marc checks the app. He sees the community-verified average price for mortar nearby, allowing him to quote with confidence and protected margins.

### Journey 3: The Automated Compliance (Sophie, Accountant)
At month-end, Sophie downloads a structured, e-invoicing 2026-compliant bundle. No chasing missing receipts; 100% reconciliation achieved in minutes.

## Functional Requirements

### Document Processing
- **FR1**: Single and serial (Batch) invoice capture.
- **FR2**: Automatic extraction of Vendor, Date, Total, and Line-item details.
- **FR3**: "Quick-Swipe" validation interface for AI suggestions.
- **FR4**: Advanced fuzzy-logic duplicate detection.

### Project & Market Intelligence
- **FR5**: Automatic Project tagging based on GPS-POS proximity.
- **FR6**: Anonymized community price map (Localized Radius).
- **FR7**: Real-time project cost tracking vs. initial estimates.
- **FR8**: AI-assisted Product Sheet enrichment (Photos, Specs).

### System & Sync
- **FR9**: 100% Functional offline OCR and local storage.
- **FR10**: User-defined sync logic (Wi-Fi, 5G, or Manual).
- **FR11**: Standards-compliant export (Pennylane, Sage, QuickBooks).

## Non-Functional Requirements

### Performance & Resilience
- **NFR1**: Unified UI LCP: **< 1.2s**.
- **NFR2**: Edge Inference Latency: **< 3s**.
- **NFR3**: 100% availability in offline conditions for core scan workflow.
- **NFR4**: Battery-conscious processing (< 15% daily drain).

### Security & Compliance
- **NFR5**: AES-256 encryption at rest; TLS 1.3 in transit.
- **NFR6**: Supabase Row Level Security (RLS) enforcement.
- **NFR7**: 2026 AI Transparency Manifest compliance.
- **NFR8**: Multi-layered data anonymization for shared pricing.

## Scoping & Roadmap

### Phase 1: MVP (The Core)
- Batch Scan & Elite OCR.
- Basic Project Tracking.
- GPS Supplier tagging.
- Offline support.

### Phase 2: Growth (The Community)
- Community Price Map.
- Anti-duplicate Shield.
- E-Invoicing 2026 Compliance features.

### Phase 3: Vision (The Ecosystem)
- Marketplace direct ordering.
- Multi-user / Team collaboration.
- Predictive material inventory.

### Ingestion Numérique (PDF & Email)
- **FR21**: L'utilisateur peut glisser-déposer des fichiers PDF/Images sur le Dashboard Web pour traitement immédiat.
- **FR22**: Le système peut recevoir et traiter des factures envoyées par email à une adresse dédiée.
- **FR23**: Le moteur IA doit différencier les PDF natifs (texte extractible) des PDF scannés pour optimiser la précision.

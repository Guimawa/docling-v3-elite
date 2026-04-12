---
name: docling-legal-footer-expert
description: >
  Expert senior Docling — footer public complet, conformité (RGPD, cookies, accessibilité),
  pages légales honnêtes, plan du site, i18n FR/ES/CA, accessibilité et SEO.
  Use when implementing or reviewing the landing footer, legal pages, cookie policy,
  accessibility statement, sitemap page, or « footer 20/20 » / bande légal professionnelle.
model: inherit
---

# Docling — Expert senior footer légal & conformité (honnête)

## Mission

Livrer un **footer public** et les **pages associées** au niveau **20/20** : complet, utile, professionnel, **sans mensonge** (pas de statut RGPD/accessibilité inventé, pas de traceurs non déclarés).

## Périmètre code

| Zone | Fichiers |
|------|----------|
| Bande liens | `apps/pwa/src/components/PublicLegalNav.jsx` |
| Pages légales | `apps/pwa/src/features/marketing/LegalDocumentPage.jsx` |
| Contenus i18n | `apps/pwa/src/shared/i18n/legalPublicI18n.js` + fusion `publicI18n.js` |
| Landing / marketing | `LandingPage.jsx`, `MarketingLayout.jsx` |
| SEO | `usePageSeo.js` — titres et meta par route |
| Routes | `App.jsx` — routes publiques `/mentions-legales`, `/cgu`, `/confidentialite`, `/accessibilite`, `/cookies`, `/plan-du-site` |

## Barème 20/20 (Definition of Done)

| Pts | Critère |
|-----|---------|
| 4 | Bande légal visible, responsive, hiérarchie lisible. |
| 4 | Pages mentions, CGU, confidentialité, accessibilité, cookies, plan du site. |
| 3 | Textes honnêtes (IA assistée, contrôle humain, pas de promesse ERP fictive). |
| 3 | i18n FR/ES/CA pour libellés et contenus légaux. |
| 3 | A11y : `nav` étiqueté, focus clavier, ancres confidentialité pour fraude/incident. |
| 3 | `pnpm --dir apps/pwa lint` + tests Vitest ciblés verts. |

## Références

- Skill : `.agents/skills/docling-landing-marketing/SKILL.md`
- Rubriques : `.agents/skills/docling-landing-marketing/references/STRUCTURE-RUBRICS-FAQ.md`

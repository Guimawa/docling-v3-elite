import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLE_NOT_FOUND = 'Page introuvable — Docling'

/** Titres courts pour l’onglet (marque en suffixe). */
const ROUTE_TITLES = {
  '/': 'Docling — Factures fournisseurs BTP, extraction IA & catalogue',
  '/tarifs': 'Tarifs — Docling',
  '/a-propos': 'À propos — Docling',
  '/aide': 'Aide — Docling',
  '/login': 'Connexion — Docling',
  '/register': 'Inscription — Docling',
  '/scan': 'Scanner une facture — Docling',
  '/validation': 'Validation des extractions — Docling',
  '/catalogue': 'Catalogue de prix BTP — Docling',
  '/history': 'Historique des factures — Docling',
  '/settings': 'Réglages — Docling',
  '/onboarding': 'Bienvenue — Docling',
  '/integrations': 'Intégrations & exports — Docling',
  '/design-system': 'Design system (dev) — Docling',
  '/mentions-legales': 'Mentions légales — Docling',
  '/cgu': 'Conditions générales d’utilisation — Docling',
  '/confidentialite': 'Politique de confidentialité — Docling',
  '/accessibilite': 'Accessibilité numérique — Docling',
  '/cookies': 'Cookies et traceurs — Docling',
  '/plan-du-site': 'Plan du site — Docling',
}

/**
 * Meta descriptions uniques (~150–160 car.), orientées requêtes BTP / factures / catalogue.
 * Pas de chiffres invérifiables dans les snippets.
 */
const ROUTE_DESCRIPTIONS = {
  '/':
    'Docling : numérisez vos factures fournisseurs BTP (PDF, photo). Extraction IA multilingue, validation humaine, catalogue de prix et export CSV ou Excel pour vos achats et chantiers.',
  '/tarifs':
    'Tarifs Docling pour artisans et PME du bâtiment : essai, offre Pro et contact entreprise pour un chiffrage selon volume et besoins.',
  '/a-propos':
    'À propos de Docling : plateforme web pour structurer les factures fournisseurs du BTP, du terrain au bureau, avec contrôle utilisateur après extraction.',
  '/aide':
    'Aide Docling : connexion, essai gratuit, raccourcis (Ctrl+K), export de données et premiers pas dans l’application.',
  '/login': 'Connectez-vous à Docling pour accéder au scan, au catalogue et à l’historique de vos factures.',
  '/register': 'Créez un compte Docling pour sauvegarder votre catalogue et votre historique de factures.',
  '/scan':
    'Envoyez une facture photo ou PDF : Docling analyse le document, puis vous validez les lignes avant enregistrement au catalogue.',
  '/validation':
    'Validez ou corrigez les lignes extraites avant de les enregistrer dans votre catalogue de prix BTP.',
  '/catalogue':
    'Recherchez et exportez les prix de votre catalogue fournisseurs BTP en CSV ou Excel pour vos achats et votre suivi.',
  '/history':
    'Consultez l’historique des factures traitées et le suivi des extractions dans Docling.',
  '/settings':
    'Réglages Docling : entreprise, modèle IA, connexion API, données personnelles (RGPD) et préférences.',
  '/onboarding': 'Quelques questions pour personnaliser votre espace Docling avant de scanner vos factures.',
  '/integrations':
    'Exports CSV et Excel, usage avec tableurs et outils métiers — pas de connecteur ERP obligatoire.',
  '/design-system': 'Aperçu interne des composants UI Docling (environnement de développement).',
  '/mentions-legales':
    'Mentions légales Docling : éditeur du site et de l’application, hébergement et contact.',
  '/cgu':
    'Conditions générales d’utilisation Docling : service d’aide à la structuration des factures, compte, limites de l’extraction IA et responsabilités.',
  '/confidentialite':
    'Politique de confidentialité Docling : données personnelles, finalités, sous-traitants techniques, droits RGPD et signalements.',
  '/accessibilite':
    'Déclaration d’accessibilité Docling : engagement d’amélioration continue et statut au regard du RGAA.',
  '/cookies':
    'Politique cookies Docling : cookies nécessaires, pas de publicité comportementale par défaut, gestion du navigateur.',
  '/plan-du-site':
    'Plan du site public Docling : accueil, tarifs, aide, pages légales et entrées utiles pour la navigation.',
}

const NOINDEX_PATHS = new Set(['/design-system'])

function siteBaseUrl() {
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.startsWith('http')) {
    return fromEnv.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}`
  }
  return ''
}

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/'
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function ensureMeta(selector, create) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = create()
    document.head.appendChild(el)
  }
  return el
}

function setMetaName(name, content) {
  if (!content) return
  const el = ensureMeta(`meta[name="${name}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute('name', name)
    return m
  })
  el.setAttribute('content', content)
}

function setMetaProperty(property, content) {
  if (!content) return
  const el = ensureMeta(`meta[property="${property}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute('property', property)
    return m
  })
  el.setAttribute('content', content)
}

function setLinkRel(rel, href) {
  if (!href) return
  const el = ensureMeta(`link[rel="${rel}"]`, () => {
    const l = document.createElement('link')
    l.setAttribute('rel', rel)
    return l
  })
  el.setAttribute('href', href)
}

const DEFAULT_OG_TYPE = 'website'

/**
 * Met à jour title, meta description, Open Graph, Twitter Card et lien canonique (SPA).
 * Utiliser VITE_SITE_URL en prod pour des URL absolues correctes (partages, indexation).
 */
export function usePageSeo() {
  const { pathname } = useLocation()

  useEffect(() => {
    const key = normalizePathname(pathname)
    const base = siteBaseUrl()
    const path = key === '/' ? '' : key
    const canonical = `${base}${path || '/'}`
    const title = ROUTE_TITLES[key] ?? TITLE_NOT_FOUND
    const description = ROUTE_DESCRIPTIONS[key] ?? ROUTE_DESCRIPTIONS['/']
    const robots = NOINDEX_PATHS.has(key) ? 'noindex, nofollow' : 'index, follow'
    const ogImage = `${base}/icons/icon-512.png`

    document.title = title

    setMetaName('description', description)
    setMetaName('robots', robots)

    setMetaProperty('og:type', DEFAULT_OG_TYPE)
    setMetaProperty('og:title', title)
    setMetaProperty('og:description', description)
    setMetaProperty('og:url', canonical)
    setMetaProperty('og:image', ogImage)
    setMetaProperty('og:site_name', 'Docling')
    setMetaProperty('og:locale', 'fr_FR')

    setMetaName('twitter:card', 'summary_large_image')
    setMetaName('twitter:title', title)
    setMetaName('twitter:description', description)

    setLinkRel('canonical', canonical)
  }, [pathname])
}

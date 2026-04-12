/**
 * publicI18n.js — Multilingual public strings (FR / ES / CA)
 *
 * Exports:
 *   - CHANGE_EVENT         : custom event name for language changes
 *   - PUBLIC_LANGUAGES     : list of selectable public languages
 *   - getPublicLanguage()  : current language from storage
 *   - setPublicLanguage()  : persist + emit language change
 *   - usePublicI18n()      : React hook → { t, language, setLanguage }
 *   - publicI18n           : raw translations object (landing 2026 copy)
 *
 * Landing copy: docling-landing-marketing skill compliant
 *   - No fabricated KPIs, no fake testimonials
 *   - Honest copy: "IA extraction, human validation"
 *   - CSV/Excel export (no phantom ERP connector)
 */

import { useCallback, useEffect, useState } from 'react'

// ─── Language persistence ─────────────────────────────────────────────────
export const CHANGE_EVENT = 'docling:public-language-changed'
const STORAGE_KEY = 'docling_public_lang'
const SUPPORTED = ['fr', 'es', 'ca']

export const PUBLIC_LANGUAGES = [
  { value: 'fr', label: 'FR' },
  { value: 'es', label: 'ES' },
  { value: 'ca', label: 'CA' },
]

export function getPublicLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch { /* ignore */ }

  /**
   * Senior Ultimate 2026: Check 'navigator.languages' for best match.
   * Scans all user preferred languages instead of just the primary one.
   */
  if (typeof navigator !== 'undefined' && navigator.languages) {
    for (const lang of navigator.languages) {
      const code = lang.slice(0, 2).toLowerCase()
      if (SUPPORTED.includes(code)) return code
    }
  }

  const browser = (typeof navigator !== 'undefined' ? (navigator.language || '') : '').slice(0, 2).toLowerCase()
  return SUPPORTED.includes(browser) ? browser : 'fr'
}

export function setPublicLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: lang }))
}

// ─── React hook ───────────────────────────────────────────────────────────
export function usePublicI18n() {
  const [language, setLanguageState] = useState(getPublicLanguage)

  useEffect(() => {
    const handler = (e) => setLanguageState(e.detail)
    window.addEventListener(CHANGE_EVENT, handler)
    return () => window.removeEventListener(CHANGE_EVENT, handler)
  }, [])

  const setLanguage = useCallback((lang) => {
    setPublicLanguage(lang)
    setLanguageState(lang)
  }, [])

  const t = TRANSLATIONS[language] ?? TRANSLATIONS.fr
  return { t, language, setLanguage }
}

// ─── Translation data ─────────────────────────────────────────────────────

const LANDING_FR = {
  badge: 'Disponible sur web et mobile',
  heroTitle: 'Extraction de factures BTP dopée à l\'IA.',
  heroHighlight: 'BTP',
  heroDescription:
    'Récupérez les données (articles, tarifs, quantités) de vos PDF en quelques secondes. Vérifiées par l\'IA, validées par vous-même. Le tout exportable proprement au format CSV.',
  themeIvory: 'Ivoire',
  themeAurora: 'Aurore',
  themeStudio: 'Studio',
  themePickerLabel: 'Ambiance',
  quickAccessTitle: 'Accès rapide',
  quickAccessSubtitle: 'Prêt à commencer ?',
  quickAccessDescription: 'Connectez-vous ou essayez gratuitement sans compte.',
  quickLogin: 'Se connecter',
  quickRegister: 'Créer un compte',
  googleSignIn: 'Continuer avec Google',
  quickTrial: 'Essai sans inscription',
  quickFormats: 'Formats acceptés : PDF, JPG, PNG, WebP',
  loginArrow: 'Connexion →',
  stats: [
    { value: 'PDF & Photo', label: 'Formats supportés' },
    { value: 'Validation', label: 'Humaine avant enregistrement' },
    { value: 'Export CSV', label: 'Prêt pour vos outils métier' },
  ],
  trustTitle: 'Une approche honnête',
  trustItems: [
    {
      title: 'IA + relecture humaine',
      body: 'L\'extraction Gemini est performante, mais l\'interface vous force à valider chaque ligne avant d\'alimenter votre catalogue. Vous gardez 100 % du contrôle.',
    },
    {
      title: 'Format standard BTP',
      body: 'Engins, quincaillerie, main d\'œuvre : notre modèle est calé sur les typologies de factures des artisans, PME et acheteurs du bâtiment.',
    },
    {
      title: 'Interopérabilité simple',
      body: 'Pas de promesses ERP magiques. Nous vous offrons un CSV propre et structuré, compatible avec tous les logiciels de devis du marché.',
    },
  ],
  featuresBadge: 'La méthode',
  featuresTitle: 'Quatre étapes, zéro friction',
  features: [
    {
      icon: '📄',
      title: 'Scan Intelligent & Détection',
      description:
        'Déposez n\'importe quelle facture (photo, PDF scanné ou texte). L\'IA extrait les lignes de produits avec précision.',
    },
    {
      icon: '✅',
      title: 'Gatekeeper de Validation',
      description:
        'Une interface claire compare la facture avec l\'extraction : vous corrigez d\'un clic avant d\'enregistrer.',
    },
    {
      icon: '🗂️',
      title: 'Déduplication Temporelle',
      description:
        'Ne gardez qu\'une seule instance d\'article dans votre catalogue, avec un historique chronologique des prix.',
    },
    {
      icon: '📊',
      title: 'Export & Analyse',
      description:
        'Générez vos listes prêtes à l\'emploi. Injectez ces tarifs directement dans vos logiciels de devis.',
    },
  ],
  demoTitle: 'Voyez par vous-même',
  demoDescription:
    'Déposez une facture, l\'IA extrait les lignes, vous validez. Aussi simple que ça.',
  demoPlaceholder: 'Vidéo de démo bientôt disponible — en attendant, testez gratuitement ci-dessous.',
  testimonialTitle: 'Cas d\'usage types',
  testimonials: [
    {
      quote:
        'J\'importe mes factures Leroy Merlin et BSH directement depuis mon téléphone après chaque commande.',
      author: 'Artisan peintre',
      role: 'Illustration — profil type',
    },
    {
      quote:
        'Nos acheteurs scannent les tarifs fournisseurs et les retrouvent dans notre catalogue partagé le lendemain.',
      author: 'PME second œuvre',
      role: 'Illustration — profil type',
    },
    {
      quote:
        'La validation IA + humaine nous a évité plusieurs erreurs de saisie sur des remises exceptionnelles.',
      author: 'Conducteur de travaux',
      role: 'Illustration — profil type',
    },
  ],
  faqTitle: 'Questions fréquentes',
  faqLead: 'Réponses directes, sans langue de bois.',
  faqCategories: [
    {
      title: 'Données & Vie privée',
      items: [
        {
          q: 'Mes factures sont-elles utilisées pour entraîner l\'IA publique ?',
          a: 'Absolument pas. Les données transitent via des API de niveau Entreprise conformes (Google Vertex AI) et ne servent pas à entraîner les modèles grands publics.',
        },
        {
          q: 'Où sont stockées mes factures ?',
          a: 'Les fichiers sont chiffrés au repos sur un stockage cloud compatible S3. Ils ne sont jamais partagés ni vendus.',
        },
      ],
    },
    {
      title: 'Produit & Limites',
      items: [
        {
          q: 'Docling est-il un logiciel de devis complet ?',
          a: 'Non. Nous sommes la brique manquante entre vos PDF fournisseurs et votre logiciel de devis habituel. Nous extrayons, vous validez, vous exportez.',
        },
        {
          q: 'Pourquoi parlez-vous de validation humaine ?',
          a: 'Ceux qui promettent 100 % d\'automatisation sans relecture mentent. Notre valeur ajoutée, c\'est l\'interface qui vous permet de repérer et de corriger à la volée avant tout enregistrement.',
        },
        {
          q: 'Quels formats de factures sont supportés ?',
          a: 'PDF texte, PDF scanné (OCR), photos JPG/PNG/WebP. La qualité d\'extraction dépend de la lisibilité du document.',
        },
      ],
    },
    {
      title: 'Tarifs & Essai',
      items: [
        {
          q: 'Puis-je tester sans créer de compte ?',
          a: 'Oui. Le mode essai vous permet d\'importer et de valider quelques factures sans inscription. Les données ne sont pas conservées entre les sessions.',
        },
        {
          q: 'Comment fonctionne la facturation ?',
          a: 'Consultez notre page Tarifs pour les détails. Nous ne demandons pas de carte bancaire pour l\'essai gratuit.',
        },
      ],
    },
  ],
  ctaTitle: 'Prêt à maîtriser vos prix fournisseurs ?',
  ctaHighlight: 'prix fournisseurs',
  ctaDescription:
    'Importez votre première facture gratuitement. Aucune carte bancaire, aucune installation.',
  ctaRegister: 'Créer un compte',
  footerDisclaimer:
    'Docling est un outil d\'aide à la saisie et à la structuration de données. Les montants et libellés extraits doivent être vérifiés par l\'utilisateur avant toute utilisation comptable ou fiscale.',
  footerDescription:
    'Des prix fournisseurs à jour pour des marges maîtrisées.',
  footerProduct: 'Produit',
  footerScanner: 'Scanner',
  footerCatalogue: 'Catalogue',
  footerHistory: 'Historique',
  footerTrialNoAccount: 'Essai sans compte',
  footerResources: 'Ressources',
  footerHelp: 'Centre d\'aide',
  footerPricing: 'Tarifs',
  footerAbout: 'À propos',
  footerIntegrations: 'Intégrations',
  footerAccount: 'Compte',
  footerLogin: 'Connexion',
  footerRegister: 'Inscription',
}

const LANDING_ES = {
  ...LANDING_FR,
  badge: 'Disponible en web y móvil',
  heroTitle: 'Extracción de facturas construcción con IA.',
  heroHighlight: 'construcción',
  heroDescription:
    'Obtenga datos (artículos, tarifas, cantidades) de sus PDF en segundos. Verificados por IA, validados por usted. Todo exportable en CSV.',
  themeIvory: 'Marfil',
  themeAurora: 'Aurora',
  themeStudio: 'Estudio',
  themePickerLabel: 'Tema',
  quickLogin: 'Iniciar sesión',
  quickRegister: 'Crear cuenta',
  googleSignIn: 'Continuar con Google',
  quickTrial: 'Prueba sin registro',
  quickFormats: 'Formatos aceptados: PDF, JPG, PNG, WebP',
  loginArrow: 'Conexión →',
  stats: [
    { value: 'PDF & Foto', label: 'Formatos soportados' },
    { value: 'Validación', label: 'Humana antes de guardar' },
    { value: 'Export CSV', label: 'Listo para sus herramientas' },
  ],
  trustTitle: 'Un enfoque honesto',
  trustItems: [
    {
      title: 'IA + revisión humana',
      body: 'La extracción Gemini es eficiente, pero la interfaz le obliga a validar cada línea antes de alimentar su catálogo. Usted mantiene el 100 % del control.',
    },
    {
      title: 'Formato estándar construcción',
      body: 'Maquinaria, ferretería, mano de obra: nuestro modelo está calibrado para la tipología de facturas de autónomos, pymes y compradores del sector.',
    },
    {
      title: 'Interoperabilidad simple',
      body: 'Sin promesas de conectores ERP mágicos. Le ofrecemos un CSV limpio y estructurado, compatible con todos los programas de presupuesto del mercado.',
    },
  ],
  featuresBadge: 'El método',
  featuresTitle: 'Cuatro pasos, cero fricción',
  features: [
    {
      icon: '📄',
      title: 'Escaneo Inteligente & Detección',
      description:
        'Suba cualquier factura (foto, PDF escaneado o texto). La IA extrae las líneas de producto con precisión.',
    },
    {
      icon: '✅',
      title: 'Gatekeeper de Validación',
      description:
        'Una interfaz clara compara la factura con la extracción: corrija con un clic antes de guardar.',
    },
    {
      icon: '🗂️',
      title: 'Deduplicación Temporal',
      description:
        'Mantenga una sola entrada por artículo en su catálogo, con un historial cronológico de precios.',
    },
    {
      icon: '📊',
      title: 'Exportación & Análisis',
      description:
        'Genere sus listas listas para usar. Inyecte estas tarifas directamente en su software de presupuesto.',
    },
  ],
  demoTitle: 'Véalo en acción',
  demoDescription:
    'Suba una factura, la IA extrae las líneas, usted valida. Así de simple.',
  demoPlaceholder: 'Vídeo demo próximamente — mientras tanto, pruebe gratis.',
  testimonialTitle: 'Casos de uso típicos',
  testimonials: [
    {
      quote:
        'Importo mis facturas de Leroy Merlin directamente desde el móvil tras cada pedido.',
      author: 'Pintor autónomo',
      role: 'Ilustración — perfil tipo',
    },
    {
      quote:
        'Nuestros compradores escanean las tarifas de proveedores y las encuentran en el catálogo compartido al día siguiente.',
      author: 'Pyme de acabados',
      role: 'Ilustración — perfil tipo',
    },
    {
      quote:
        'La validación IA + humana nos evitó varios errores en descuentos especiales.',
      author: 'Jefe de obra',
      role: 'Ilustración — perfil tipo',
    },
  ],
  faqTitle: 'Preguntas frecuentes',
  faqLead: 'Respuestas directas, sin rodeos.',
  faqCategories: [
    {
      title: 'Datos & Privacidad',
      items: [
        {
          q: '¿Mis facturas se usan para entrenar la IA pública?',
          a: 'En absoluto. Los datos transitan por APIs de nivel Empresa (Google Vertex AI) y no se usan para entrenar modelos públicos.',
        },
        {
          q: '¿Dónde se almacenan mis facturas?',
          a: 'Los archivos se cifran en reposo en un almacenamiento cloud compatible con S3. No se comparten ni venden.',
        },
      ],
    },
    {
      title: 'Producto & Límites',
      items: [
        {
          q: '¿Docling es un software de presupuestos completo?',
          a: 'No. Somos el eslabón que falta entre sus PDF de proveedores y su software de presupuestos habitual.',
        },
        {
          q: '¿Por qué hablan de validación humana?',
          a: 'Quien promete 100 % de automatización sin revisión miente. Nuestro valor es la interfaz que le permite detectar y corregir antes de guardar.',
        },
        {
          q: '¿Qué formatos de factura se admiten?',
          a: 'PDF texto, PDF escaneado (OCR), fotos JPG/PNG/WebP. La calidad de extracción depende de la legibilidad del documento.',
        },
      ],
    },
    {
      title: 'Precios & Prueba',
      items: [
        {
          q: '¿Puedo probar sin crear cuenta?',
          a: 'Sí. El modo prueba le permite importar y validar algunas facturas sin registro. Los datos no se conservan entre sesiones.',
        },
        {
          q: '¿Cómo funciona la facturación?',
          a: 'Consulte nuestra página de Precios para los detalles. No pedimos tarjeta bancaria para la prueba gratuita.',
        },
      ],
    },
  ],
  ctaTitle: '¿Listo para dominar los precios de proveedores?',
  ctaHighlight: 'precios de proveedores',
  ctaDescription:
    'Importe su primera factura gratis. Sin tarjeta bancaria, sin instalación.',
  ctaRegister: 'Crear cuenta',
  footerDisclaimer:
    'Docling es una herramienta de ayuda a la captura y estructuración de datos. Los importes y descripciones extraídos deben ser verificados por el usuario antes de cualquier uso contable o fiscal.',
  footerDescription:
    'Precios de proveedores actualizados para márgenes controlados.',
  footerProduct: 'Producto',
  footerScanner: 'Escáner',
  footerCatalogue: 'Catálogo',
  footerHistory: 'Historial',
  footerTrialNoAccount: 'Prueba sin cuenta',
  footerResources: 'Recursos',
  footerHelp: 'Centro de ayuda',
  footerPricing: 'Precios',
  footerAbout: 'Acerca de',
  footerIntegrations: 'Integraciones',
  footerAccount: 'Cuenta',
  footerLogin: 'Iniciar sesión',
  footerRegister: 'Registro',
}

const LANDING_CA = {
  ...LANDING_FR,
  badge: 'Disponible a web i mòbil',
  heroTitle: 'Extracció de factures construcció amb IA.',
  heroHighlight: 'construcció',
  heroDescription:
    'Obteniu dades (articles, tarifes, quantitats) dels vostres PDF en pocs segons. Verificades per IA, validades per vosaltres. Tot exportable en CSV.',
  themeIvory: 'Vori',
  themeAurora: 'Aurora',
  themeStudio: 'Estudi',
  themePickerLabel: 'Tema',
  quickLogin: 'Iniciar sessió',
  quickRegister: 'Crear compte',
  googleSignIn: 'Continuar amb Google',
  quickTrial: 'Prova sense registre',
  quickFormats: 'Formats acceptats: PDF, JPG, PNG, WebP',
  loginArrow: 'Connexió →',
  stats: [
    { value: 'PDF & Foto', label: 'Formats suportats' },
    { value: 'Validació', label: 'Humana abans de desar' },
    { value: 'Export CSV', label: 'Llest per als vostres eines' },
  ],
  trustTitle: 'Un enfocament honest',
  trustItems: [
    {
      title: 'IA + revisió humana',
      body: 'L\'extracció Gemini és eficient, però la interfície us obliga a validar cada línia abans d\'alimentar el catàleg. Manteniu el 100 % del control.',
    },
    {
      title: 'Format estàndard construcció',
      body: 'Maquinària, ferreteria, mà d\'obra: el nostre model s\'ajusta a les tipologies de factures d\'artesans, pimes i compradors del sector.',
    },
    {
      title: 'Interoperabilitat senzilla',
      body: 'Sense promeses de connectors ERP màgics. Us oferim un CSV net i estructurat, compatible amb tots els programes de pressupost del mercat.',
    },
  ],
  featuresBadge: 'El mètode',
  featuresTitle: 'Quatre passos, zero fricció',
  features: [
    {
      icon: '📄',
      title: 'Escaneig Intel·ligent & Detecció',
      description:
        'Pengeu qualsevol factura (foto, PDF escanejat o text). La IA extreu les línies de producte amb precisió.',
    },
    {
      icon: '✅',
      title: 'Gatekeeper de Validació',
      description:
        'Una interfície clara compara la factura amb l\'extracció: corregiu amb un clic abans de desar.',
    },
    {
      icon: '🗂️',
      title: 'Deduplicació Temporal',
      description:
        'Manteniu una sola entrada per article al catàleg, amb un historial cronològic de preus.',
    },
    {
      icon: '📊',
      title: 'Exportació & Anàlisi',
      description:
        'Genereu les vostres llistes llestes per usar. Injecteu aquestes tarifes directament al vostre programari de pressupost.',
    },
  ],
  demoTitle: 'Veieu-ho en acció',
  demoDescription:
    'Pengeu una factura, la IA extreu les línies, vosaltres valideu. Tan senzill com això.',
  demoPlaceholder: 'Vídeo demo aviat disponible — mentrestant, proveu gratuïtament.',
  testimonialTitle: 'Casos d\'ús típics',
  testimonials: [
    {
      quote:
        'Importo les meves factures de Leroy Merlin directament des del mòbil després de cada comanda.',
      author: 'Pintor autònom',
      role: 'Il·lustració — perfil tipus',
    },
    {
      quote:
        'Els nostres compradors escanegen les tarifes de proveïdors i les troben al catàleg compartit l\'endemà.',
      author: 'Pime d\'acabats',
      role: 'Il·lustració — perfil tipus',
    },
    {
      quote:
        'La validació IA + humana ens va evitar diversos errors en descomptes especials.',
      author: 'Cap d\'obra',
      role: 'Il·lustració — perfil tipus',
    },
  ],
  faqTitle: 'Preguntes freqüents',
  faqLead: 'Respostes directes, sense embuts.',
  faqCategories: [
    {
      title: 'Dades & Privacitat',
      items: [
        {
          q: 'Les meves factures s\'usen per entrenar la IA pública?',
          a: 'En absolut. Les dades transiten per APIs de nivell Empresa (Google Vertex AI) i no s\'usen per entrenar models públics.',
        },
        {
          q: 'On s\'emmagatzemen les meves factures?',
          a: 'Els fitxers es xifren en repòs en un emmagatzematge cloud compatible amb S3. No es comparteixen ni venen.',
        },
      ],
    },
    {
      title: 'Producte & Límits',
      items: [
        {
          q: 'Docling és un programari de pressupostos complet?',
          a: 'No. Som l\'esllaó que falta entre els vostres PDF de proveïdors i el vostre programari de pressupostos habitual.',
        },
        {
          q: 'Per què parleu de validació humana?',
          a: 'Qui promet 100 % d\'automatització sense revisió menteix. El nostre valor és la interfície que us permet detectar i corregir abans de desar.',
        },
        {
          q: 'Quins formats de factura s\'admeten?',
          a: 'PDF text, PDF escanejat (OCR), fotos JPG/PNG/WebP. La qualitat d\'extracció depèn de la llegibilitat del document.',
        },
      ],
    },
    {
      title: 'Preus & Prova',
      items: [
        {
          q: 'Puc provar sense crear compte?',
          a: 'Sí. El mode prova us permet importar i validar algunes factures sense registre. Les dades no es conserven entre sessions.',
        },
        {
          q: 'Com funciona la facturació?',
          a: 'Consulteu la nostra pàgina de Preus per als detalls. No demanem targeta bancària per a la prova gratuïta.',
        },
      ],
    },
  ],
  ctaTitle: 'Preparats per dominar els preus de proveïdors?',
  ctaHighlight: 'preus de proveïdors',
  ctaDescription:
    'Importeu la primera factura gratuïtament. Sense targeta bancària, sense instal·lació.',
  ctaRegister: 'Crear compte',
  footerDisclaimer:
    'Docling és una eina d\'ajuda a la captura i estructuració de dades. Els imports i descripcions extrets han de ser verificats per l\'usuari abans de qualsevol ús comptable o fiscal.',
  footerDescription:
    'Preus de proveïdors actualitzats per a marges controlats.',
  footerProduct: 'Producte',
  footerScanner: 'Escàner',
  footerCatalogue: 'Catàleg',
  footerHistory: 'Historial',
  footerTrialNoAccount: 'Prova sense compte',
  footerResources: 'Recursos',
  footerHelp: 'Centre d\'ajuda',
  footerPricing: 'Preus',
  footerAbout: 'Sobre nosaltres',
  footerIntegrations: 'Integracions',
  footerAccount: 'Compte',
  footerLogin: 'Iniciar sessió',
  footerRegister: 'Registre',
}

// ─── Nav strings ──────────────────────────────────────────────────────────

const NAV_FR = {
  features: 'Fonctionnalités',
  pricing: 'Tarifs',
  about: 'À propos',
  help: 'Aide',
  login: 'Connexion',
  register: 'S\'inscrire',
  trial: 'Essai gratuit',
  marketingAria: 'Navigation marketing',
  languageSr: 'Langue',
  languageLabel: 'Choisir la langue',
}
const NAV_ES = {
  features: 'Funcionalidades',
  pricing: 'Precios',
  about: 'Acerca de',
  help: 'Ayuda',
  login: 'Iniciar sesión',
  register: 'Registrarse',
  trial: 'Prueba gratuita',
  marketingAria: 'Navegación marketing',
  languageSr: 'Idioma',
  languageLabel: 'Seleccionar idioma',
}
const NAV_CA = {
  features: 'Funcionalitats',
  pricing: 'Preus',
  about: 'Sobre nosaltres',
  help: 'Ajuda',
  login: 'Iniciar sessió',
  register: 'Registrar-se',
  trial: 'Prova gratuïta',
  marketingAria: 'Navegació màrqueting',
  languageSr: 'Llengua',
  languageLabel: 'Escollir la llengua',
}

// ─── Full translations map ────────────────────────────────────────────────

const TRANSLATIONS = {
  fr: { 
    landing: LANDING_FR, 
    nav: NAV_FR,
    marketing: {
      pricing: {
        title: 'Tarifs transparents',
        subtitle: 'Une offre adaptée à votre volume et vos besoins de souveraineté.',
        starterDescription: 'Extraction IA haute fidélité. Idéal pour débuter avec vos premières factures.',
        proDescription: 'Le choix préféré des PME. Traitement prioritaire et historique illimité.',
        eliteDescription: 'Souveraineté totale. Vos données sur votre cloud (S3/Storj). Support VIP.',
        subscribeCta: 'S\'abonner',
        subscribeLoading: 'Chargement...',
        subscribeError: 'Une erreur est survenue lors de la création de la session.',
        subscribeLoginRequired: 'Veuillez vous connecter pour souscrire.',
        subscribeUnavailable: 'Service Stripe temporairement indisponible.',
        contactPrefix: 'Pour des volumes importants, contactez-nous :',
      }
    }
  },
  es: { 
    landing: LANDING_ES, 
    nav: NAV_ES,
    marketing: {
      pricing: {
        title: 'Precios transparentes',
        subtitle: 'Una oferta adaptada a su volumen y necesidades de soberanía.',
        starterDescription: 'Extracción IA de alta fidelidad. Ideal para empezar con sus facturas.',
        proDescription: 'La opción preferida de las PYMES. Procesamiento prioritario e historial ilimitado.',
        eliteDescription: 'Soberanía total. Sus datos en su propia nube (S3/Storj). Soporte VIP.',
        subscribeCta: 'Suscribirse',
        subscribeLoading: 'Cargando...',
        subscribeError: 'Se ha producido un error al crear la sesión.',
        subscribeLoginRequired: 'Inicie sesión para suscribirse.',
        subscribeUnavailable: 'Servicio Stripe temporalmente no disponible.',
        contactPrefix: 'Para volúmenes grandes, contáctenos:',
      }
    }
  },
  ca: { 
    landing: LANDING_CA, 
    nav: NAV_CA,
    marketing: {
      pricing: {
        title: 'Preus transparents',
        subtitle: 'Una oferta adaptada al vostre volum i necessitats de sobirania.',
        starterDescription: 'Extracció IA d\'alta fidelitat. Ideal per començar amb les factures.',
        proDescription: 'L\'opció preferida de les PIMES. Processament prioritari i historial il·limitat.',
        eliteDescription: 'Sobirania total. Les vostres dades al vostre propi núvol (S3/Storj). Suport VIP.',
        subscribeCta: 'Subscriure\'s',
        subscribeLoading: 'Carregant...',
        subscribeError: 'S\'ha produït un error en crear la sessió.',
        subscribeLoginRequired: 'Inicieu sessió per subscriure-us.',
        subscribeUnavailable: 'Servei Stripe temporalment no disponible.',
        contactPrefix: 'Per a volums grans, contacteu-nos:',
      }
    }
  },
}

// ─── publicI18n named export (used by LandingPage directly) ──────────────

export const publicI18n = TRANSLATIONS

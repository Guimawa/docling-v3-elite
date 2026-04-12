import { AnimatePresence, motion } from 'framer-motion'
import {
  Cloud, Cpu, CreditCard, LifeBuoy, Palette, Settings, User
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { logoutAndRedirect } from '@/shared/lib/sessionManager'
import { useDoclingStore } from '@/store/useStore'
import PageTransition from '@/components/PageTransition'
import SettingsPageHero from './SettingsPageHero'

// Sections
import SubscriptionSection from './sections/SubscriptionSection'
import AccountSection from './sections/AccountSection'
import AppearanceSection from './sections/AppearanceSection'
import CloudSection from './sections/CloudSection'
import IntelligenceSection from './sections/IntelligenceSection'
import SupportSection from './sections/SupportSection'

const SETTINGS_KEY = 'docling_settings'

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

const FONT_OPTIONS = [
  { id: 'font-outfit', label: 'Outfit (Moderne)', family: 'Outfit, sans-serif' },
  { id: 'font-inter',  label: 'Inter (Classique)', family: 'Inter, sans-serif' },
  { id: 'font-roboto', label: 'Roboto (Standard)', family: 'Roboto, sans-serif' },
]

/** REAL PRICING PLANS 2026 */
const PRICING_PLANS = [
  { 
    id: 'starter_9', 
    name: 'Starter', 
    price: '9', 
    desc: 'Idéal pour les indépendants.',
    features: ['100 extractions / mois', 'Support standard', 'Export JSON'],
    accent: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20'
  },
  { 
    id: 'pro_19', 
    name: 'Professional', 
    price: '19', 
    desc: 'Pour les entreprises en croissance.',
    features: ['500 extractions / mois', 'Support prioritaire', 'Catalogue BTP illimité'],
    accent: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/40', popular: true
  },
  { 
    id: 'elite_29', 
    name: 'Expert Elite', 
    price: '29', 
    desc: 'Puissance maximale et IA Vision.',
    features: ['Illimité / Fair use', 'IA Vision 1.5 Pro', 'Souveraineté Cloud'],
    accent: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20'
  }
]

import { Zap, RefreshCw, Cpu as CpuIcon } from 'lucide-react'
const EXTRACTION_PROFILES = [
  { id: 'gemini-2.5-flash', label: 'Scanner Économique', summary: 'Extraction rapide pour gros volumes simples.', accuracy: 3, speed: 5, icon: Zap },
  { id: 'docling-ibm-pro', label: 'Turbo Précision', summary: 'Le plus polyvalent pour le BTP (Intelligence IBM).', accuracy: 4, speed: 4, icon: RefreshCw },
  { id: 'gemini-3.1-pro-preview', label: 'Intelligence Élite (Vision)', summary: 'Précision maximale sur manuscrits.', accuracy: 5, speed: 2, icon: CpuIcon },
]

export default function SettingsPage() {
  const navigate = useNavigate()
  
  // Zustand Hooks
  const appTheme = useDoclingStore(s => s.appTheme)
  const setAppTheme = useDoclingStore(s => s.setAppTheme)
  const selectedModel = useDoclingStore(s => s.selectedModel)
  const setModel = useDoclingStore(s => s.setModel)
  const cloudConfig = useDoclingStore(s => s.cloudConfig)
  const setCloudProvider = useDoclingStore(s => s.setCloudProvider)

  // Local State
  const [activeSection, setActiveSection] = useState('section-subscription')
  const [meData, setMeData] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const [account, setAccount] = useState(() => ({
    firstName: loadSettings().firstName ?? 'Utilisateur',
    lastName: loadSettings().lastName ?? 'Premium',
    nomEntreprise: loadSettings().nom ?? '',
    adresse: loadSettings().adresse ?? '',
    siret: loadSettings().siret ?? '',
    tel: loadSettings().tel ?? '',
    email: '',
  }))

  const [appearance, setAppearance] = useState(() => ({
    fontSize: loadSettings().fontSize ?? 13,
    fontFamily: loadSettings().fontFamily ?? 'font-outfit',
  }))

  const loadMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get(ENDPOINTS.me)
      setMeData(data)
      setAccount(prev => ({ ...prev, email: data.email }))
    } catch (err) {
      setMeData(null)
    }
  }, [])

  useEffect(() => { loadMe() }, [loadMe])

  useEffect(() => {
    const s = loadSettings()
    saveSettings({ ...s, ...account, ...appearance })
    const font = FONT_OPTIONS.find(f => f.id === appearance.fontFamily)
    if (font) document.body.style.fontFamily = font.family
  }, [account, appearance])

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true)
    try {
      const { data } = await apiClient.post(ENDPOINTS.billingPortal)
      if (data?.url) window.location.href = data.url
    } catch {
      // toast.error handled via alert in UI if needed
    } finally {
      setPortalLoading(false)
    }
  }

  const navItems = [
    { id: 'section-subscription', label: 'Abonnement', icon: CreditCard },
    { id: 'section-account',      label: 'Mon Compte',  icon: User },
    { id: 'section-appearance',   label: 'Apparence',   icon: Palette },
    { id: 'section-cloud',        label: 'Archives Cloud', icon: Cloud },
    { id: 'section-api',          label: 'Intelligence API', icon: Cpu },
    { id: 'section-support',      label: 'Support',     icon: LifeBuoy },
  ]

  const isDarkMode = appTheme === 'aurora' || appTheme === 'studio'

  return (
    <PageTransition variant="fade">
      <div className="relative min-h-screen bg-transparent">
        {/* Context Background */}
        <div className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
           <div className="absolute -right-16 top-24 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
           <div className="absolute -left-20 bottom-32 h-80 w-80 rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>

        <SettingsPageHero icon={Settings} badge="Elite Access" title="Réglages Système" description="Pilotez votre instance Docling et vos préférences visuelles." />

        <div className="mx-auto max-w-6xl px-4 pb-28 lg:flex lg:gap-12">
          {/* NAV SIDEBAR */}
          <aside className="mb-8 shrink-0 lg:mb-0 lg:w-64 lg:sticky lg:top-24">
            <nav className="flex gap-2 overflow-x-auto pb-4 lg:flex-col lg:overflow-visible">
              {navItems.map((s) => {
                const Icon = s.icon
                const isActive = activeSection === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`group relative flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-bold transition-all
                      ${isActive 
                        ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                      } lg:w-full`}
                  >
                    <Icon size={18} className={isActive ? 'text-primary' : 'text-text-tertiary group-hover:text-text-secondary'} />
                    {s.label}
                    {isActive && (
                      <motion.div layoutId="active-nav" className="absolute left-0 top-1/2 -ml-1 h-6 w-1 rounded-full bg-primary hidden lg:block" />
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="min-w-0 flex-1 lg:max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {activeSection === 'section-subscription' && (
                  <SubscriptionSection 
                    meData={meData} 
                    handleOpenBillingPortal={handleOpenBillingPortal} 
                    portalLoading={portalLoading} 
                    PRICING_PLANS={PRICING_PLANS} 
                  />
                )}
                {activeSection === 'section-account' && (
                  <AccountSection 
                    account={account} 
                    setAccount={setAccount} 
                    logoutAndRedirect={() => logoutAndRedirect({ navigate, redirectTo: '/login' })} 
                  />
                )}
                {activeSection === 'section-appearance' && (
                  <AppearanceSection 
                    appTheme={appTheme} setAppTheme={setAppTheme} isDarkMode={isDarkMode}
                    appearance={appearance} setAppearance={setAppearance} FONT_OPTIONS={FONT_OPTIONS}
                  />
                )}
                {activeSection === 'section-cloud' && (
                  <CloudSection cloudConfig={cloudConfig} setCloudProvider={setCloudProvider} />
                )}
                {activeSection === 'section-api' && (
                  <IntelligenceSection 
                    selectedModel={selectedModel} setModel={setModel} 
                    EXTRACTION_PROFILES={EXTRACTION_PROFILES} 
                  />
                )}
                {activeSection === 'section-support' && (
                  <SupportSection />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}

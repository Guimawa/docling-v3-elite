import {
  Camera,
  CheckCircle2,
  Clock,
  Home,
  LogOut,
  PackageSearch,
  Settings,
  WifiOff,
  Sparkles,
  User,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { logoutAndRedirect } from '@/shared/lib/sessionManager'
import apiClient from '@/shared/lib/apiClient'
import { ENDPOINTS } from '@/shared/config/api'
import { useAppI18n } from '@/shared/i18n/appI18n'

export default function Navbar() {
  const t = useAppI18n()
  const navigate = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [meData, setMeData] = useState(null)

  const loadMe = useCallback(async () => {
    try {
      const { data } = await apiClient.get(ENDPOINTS.me)
      setMeData(data)
    } catch {
      setMeData(null)
    }
  }, [])

  useEffect(() => {
    loadMe()
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    const onResize = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('resize', onResize)
    }
  }, [loadMe])

  const linkClass = ({ isActive }) =>
    `relative flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all duration-200
     active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-page
     ${isActive ? 'text-primary bg-primary-pale/80 shadow-sm ring-1 ring-primary/10' : 'text-text-secondary hover:text-text-primary hover:scale-105 hover:bg-elevated/60'}`

  /** Ordre : flux principal (3) puis suivi (historique, réglages). */
  const NAV_PRIMARY_COUNT = 4
  const navItems = [
    { to: '/scan', icon: Camera, label: t.scan.title, testId: 'nav-scan' },
    { to: '/validation', icon: CheckCircle2, label: t.validation.title, testId: 'nav-validation' },
    { to: '/catalogue', icon: PackageSearch, label: t.catalogue.title, testId: 'nav-catalogue' },
    { to: '/copilot', icon: Sparkles, label: t.copilot.label, testId: 'nav-copilot', highlight: true },
    { to: '/history', icon: Clock, label: t.history.title, testId: 'nav-history' },
    { to: '/settings', icon: Settings, label: t.settings.heroTitle, testId: 'nav-settings' },
  ]

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    await logoutAndRedirect({ navigate, redirectTo: '/' })
    setIsLoggingOut(false)
  }

  // User Profile Info
  const isFree = !meData || meData.subscription_status === 'free' || meData.email === 'guest@free.provisional'
  const displayName = meData?.display_name || (isFree ? t.common.freeAccess : t.common.loading)
  const companyName = meData?.company_name || (isFree ? 'Docling Free' : '...')
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <>
      {!isDesktop && (
        <>
          <div className="fixed inset-x-0 bottom-[74px] z-50 flex items-center justify-center gap-2 px-4 md:hidden">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-text-primary shadow-md backdrop-blur-md"
            >
              <Home size={13} aria-hidden />
              Accueil
            </Link>
          </div>

          <nav
            className="nav-mobile-dock fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-900/60 pb-safe pt-2 backdrop-blur-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.5)]"
            aria-label="Navigation principale"
          >
            {!online && (
              <div className="absolute -top-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-t-lg bg-amber-600/90 px-3 py-1 text-2xs font-bold text-white backdrop-blur-sm">
                <WifiOff size={11} aria-hidden />
                Hors ligne
              </div>
            )}

            <div className="flex w-full items-start justify-start gap-0 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map(({ to, icon, label, testId }) => {
                const IconComponent = icon
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={`${linkClass} min-w-[68px] shrink-0`}
                    data-testid={testId}
                    aria-label={label}
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent size={20} strokeWidth={2} aria-hidden />
                        <span className="max-w-[72px] truncate text-2xs font-semibold tracking-tight">
                          {label}
                        </span>
                        {isActive && (
                          <span
                            className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                            aria-hidden
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </nav>
        </>
      )}

      {isDesktop && (
        <nav
          className="fixed inset-y-0 left-0 z-50 flex w-[230px] flex-col border-r border-white/5 bg-nav-sidebar text-white shadow-2xl"
          aria-label="Navigation principale"
        >
          {/* Brand/Logo Section */}
          <div className="flex items-center gap-3 px-7 py-9 border-b border-white/5 bg-white/2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/20 ring-1 ring-white/10">
               <Sparkles size={20} className="text-white animate-pulse" />
            </div>
            <Link
              to="/"
              className="font-heading text-2xl font-black tracking-tighter text-white"
            >
              Doc<span className="text-primary italic">ling</span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            <section>
              <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Principal</p>
              {navItems.slice(0, NAV_PRIMARY_COUNT).map(({ to, icon, label, testId, highlight }) => {
                const IconComponent = icon
                return (
                  <NavLink
                    key={to}
                    to={to}
                    data-testid={testId}
                    aria-label={label}
                    className={({ isActive }) =>
                      `mb-1.5 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? 'bg-primary/20 text-white ring-1 ring-primary/40 shadow-lg shadow-primary/5'
                          : highlight 
                            ? 'text-primary-light/90 hover:bg-primary/10 hover:text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
                      }`
                    }
                  >
                    <IconComponent size={18} className={highlight ? 'animate-pulse text-primary-light' : ''} aria-hidden />
                    {label}
                  </NavLink>
                )
              })}
            </section>

            <section>
              <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Suivi</p>
              {navItems.slice(NAV_PRIMARY_COUNT).map(({ to, icon, label, testId }) => {
                const IconComponent = icon
                return (
                  <NavLink
                    key={to}
                    to={to}
                    data-testid={testId}
                    aria-label={label}
                    className={({ isActive }) =>
                      `mb-1.5 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? 'bg-primary/20 text-white ring-1 ring-primary/40 shadow-lg shadow-primary/5'
                          : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
                      }`
                    }
                  >
                    <IconComponent size={18} aria-hidden />
                    {label}
                  </NavLink>
                )
              })}
            </section>
          </div>

          {/* User Profile & Logout Section */}
          <div className="mt-auto border-t border-white/5 p-4 bg-white/2 space-y-4">
            <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl transition-all duration-300 hover:bg-white/10 ring-1 ring-white/5">
               <div className="relative shrink-0">
                 <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-medium to-primary-light shadow-xl ring-1 ring-white/20">
                   <span className="text-base font-black text-white">{initial}</span>
                 </div>
                 {online && (
                   <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-900 bg-success">
                     <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                   </span>
                 )}
               </div>
               <div className="min-w-0">
                 <p className="truncate text-sm font-black text-white leading-tight">{displayName}</p>
                 <p className="truncate text-[10px] font-black text-white/40 uppercase tracking-widest mt-0.5">{companyName}</p>
               </div>
            </div>
            
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] py-3 text-[11px] font-black uppercase tracking-widest text-white/50 transition-all hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 active:scale-[0.98] disabled:opacity-50"
            >
              <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
              {isLoggingOut ? t.auth.login.submitLoading : t.settings.logout}
            </button>
          </div>
        </nav>
      )}
    </>
  )
}

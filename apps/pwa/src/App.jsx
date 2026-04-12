import { lazy, Suspense, useEffect } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { Toaster } from 'sonner'
import { LogOut, Sparkles } from 'lucide-react'
import GlobalBackground from './components/GlobalBackground'
import CommandPalette from './components/CommandPalette'
import Navbar from './components/Navbar'
import PageTransition from './components/PageTransition'
import TrialModeBanner from './components/TrialModeBanner'
import OfflineBanner from './components/OfflineBanner'
import { ProtectedRoute } from './features/auth'
import SkeletonCard from '@/shared/ui/SkeletonCard'
import { useDoclingStore } from '@/store/useStore'
import { logoutAndRedirect } from '@/shared/lib/sessionManager'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const LandingPage    = lazy(() => import('./features/landing/LandingPage'))
const TarifsPage     = lazy(() => import('./features/marketing/TarifsPage'))
const AProposPage    = lazy(() => import('./features/marketing/AProposPage'))
const AidePage       = lazy(() => import('./features/marketing/AidePage'))
const ScanPage       = lazy(() => import('./features/scan/ScanPage'))
const ValidationPage = lazy(() => import('./features/validation/ValidationPage'))
const CataloguePage  = lazy(() => import('./features/catalogue/CataloguePage'))
const HistoryPage    = lazy(() => import('./features/history/HistoryPage'))
const SettingsPage   = lazy(() => import('./features/settings/SettingsPage'))
const LoginPage      = lazy(() => import('./features/auth/LoginPage'))
const RegisterPage   = lazy(() => import('./features/auth/RegisterPage'))
const OnboardingPage = lazy(() => import('./features/onboarding/OnboardingPage'))
const DesignSystemPage = lazy(() => import('./features/design-system/DesignSystemPage'))
const IntegrationsPage = lazy(() => import('./features/marketing/IntegrationsPage'))
const LegalDocumentPage = lazy(() => import('./features/marketing/LegalDocumentPage'))
const CopilotPage = lazy(() => import('./features/copilot/CopilotPage'))

function PageLoader() {
  return (
    <div
      className="mx-auto min-h-[60vh] max-w-screen-md p-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Chargement de la page…</span>
      <SkeletonCard count={4} variant="card" />
    </div>
  )
}


function LayoutWithNav({ children }) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <Navbar />
      <main
        id="main-content"
        className="relative flex-1 flex flex-col min-w-0 md:ml-[230px] transition-all duration-300"
      >
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6 md:px-10 md:py-8 motion-safe:animate-page-enter">
          <TrialModeBanner />
          {children}
        </div>
      </main>
    </div>
  )
}

function InternalNotFound() {
  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-border bg-surface/80 px-6 py-12 text-center shadow-sm"
      role="status"
    >
      <h1 className="font-heading text-4xl font-bold text-text-primary">404</h1>
      <p className="text-text-secondary">
        Cette page n&apos;existe pas dans l&apos;application Docling, ou l&apos;adresse est incorrecte.
      </p>
      <Link
        to="/scan"
        className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Retour au scanner
      </Link>
      <Link to="/" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
        Accueil marketing
      </Link>
    </div>
  )
}

const RouteWrapper = ProtectedRoute
const withPageTransition = (node, variant = 'slide') => (
  <PageTransition variant={variant} className="motion-reduce:transform-none">
    {node}
  </PageTransition>
)

export default function App() {
  useDocumentTitle()
  const appTheme = useDoclingStore((s) => s.appTheme)

  useEffect(() => {
    const id = appTheme === 'aurora' || appTheme === 'studio' ? appTheme : 'ivory'
    document.documentElement.setAttribute('data-theme', id)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute(
        'content',
        id === 'ivory' ? '#B45309' : id === 'aurora' ? '#1c1917' : '#0c0a09',
      )
    }
  }, [appTheme])

  return (
    <>
      <GlobalBackground />
      <div className="relative z-[1] min-h-screen bg-transparent text-text-primary">
      <a href="#main-content" className="skip-link">
        Aller au contenu
      </a>
      <OfflineBanner />
      <CommandPalette />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={withPageTransition(<LoginPage />, 'fade')} />
          <Route path="/register" element={withPageTransition(<RegisterPage />, 'fade')} />
          <Route path="/" element={withPageTransition(<LandingPage />, 'slideUp')} />
          <Route path="/tarifs" element={withPageTransition(<TarifsPage />, 'slideUp')} />
          <Route path="/a-propos" element={withPageTransition(<AProposPage />, 'slideUp')} />
          <Route path="/aide" element={withPageTransition(<AidePage />, 'slideUp')} />
          <Route path="/integrations" element={withPageTransition(<IntegrationsPage />, 'slideUp')} />
          <Route
            path="/mentions-legales"
            element={withPageTransition(<LegalDocumentPage pageKey="mentions" />, 'slideUp')}
          />
          <Route path="/cgu" element={withPageTransition(<LegalDocumentPage pageKey="cgu" />, 'slideUp')} />
          <Route
            path="/confidentialite"
            element={withPageTransition(<LegalDocumentPage pageKey="privacy" />, 'slideUp')}
          />
          <Route
            path="/accessibilite"
            element={withPageTransition(<LegalDocumentPage pageKey="accessibility" />, 'slideUp')}
          />
          <Route path="/cookies" element={withPageTransition(<LegalDocumentPage pageKey="cookies" />, 'slideUp')} />
          <Route
            path="/plan-du-site"
            element={withPageTransition(<LegalDocumentPage pageKey="sitemap" />, 'slideUp')}
          />
          {import.meta.env.DEV && (
            <Route path="/design-system" element={withPageTransition(<DesignSystemPage />, 'fade')} />
          )}
          <Route path="/*" element={
            <RouteWrapper>
              <LayoutWithNav>
                <Routes>
                  <Route path="/scan" element={withPageTransition(<ScanPage />, 'slide')} />
                  <Route path="/validation" element={withPageTransition(<ValidationPage />, 'slide')} />
                  <Route path="/catalogue" element={withPageTransition(<CataloguePage />, 'slide')} />
                  <Route path="/copilot" element={withPageTransition(<CopilotPage />, 'slide')} />
                  <Route path="/history" element={withPageTransition(<HistoryPage />, 'slide')} />
                  <Route path="/settings" element={withPageTransition(<SettingsPage />, 'slide')} />
                  <Route path="/onboarding" element={withPageTransition(<OnboardingPage />, 'slide')} />
                  <Route path="*" element={withPageTransition(<InternalNotFound />, 'fade')} />
                </Routes>
              </LayoutWithNav>
            </RouteWrapper>
          } />
        </Routes>
      </Suspense>

      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: 'linear-gradient(135deg, rgb(var(--c-elevated) / 0.96), rgb(var(--c-surface) / 0.92))',
            backdropFilter: 'blur(14px)',
            color: 'rgb(var(--c-text-primary))',
            border: '1px solid rgb(var(--c-border) / 0.88)',
            borderRadius: '14px',
            fontWeight: '600',
            boxShadow: 'var(--shadow-lg)',
          },
        }}
      />
      </div>
    </>
  )
}

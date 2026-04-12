import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { TRIAL_SESSION_STORAGE_KEY } from '@/shared/constants/trialAccess'

export default function TrialModeBanner() {
  const [show] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(TRIAL_SESSION_STORAGE_KEY) === '1'
  })

  if (!show) return null

  return (
    <div
      className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary/80 shadow-sm backdrop-blur-sm transition-all hover:bg-primary/10"
      role="status"
      aria-live="polite"
    >
      <Sparkles size={12} className="shrink-0" aria-hidden />
      <p>
        <span className="font-bold">Mode essai</span> — accès découverte.
      </p>
    </div>
  )
}

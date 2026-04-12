import React from 'react'
import { AlertCircle, Loader2, PackagePlus } from 'lucide-react'
import { interpolate } from '@/shared/i18n/appI18n'

export default function ScannerOfflineStatus({ isOnline, pendingCount, syncInProgress, t }) {
  if (isOnline && !syncInProgress && pendingCount === 0) return null

  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-warning/25 bg-warning-bg/90 px-4 py-3 text-sm font-semibold text-warning shadow-sm backdrop-blur-sm">
      {!isOnline && (
        <>
          <AlertCircle size={18} />
          {interpolate(t.scan.offline, { count: pendingCount })}
        </>
      )}
      {isOnline && syncInProgress && (
        <>
          <Loader2 size={18} className="animate-spin" />
          {t.scan.syncing}
        </>
      )}
      {isOnline && !syncInProgress && pendingCount > 0 && (
        <>
          <PackagePlus size={18} />
          {interpolate(t.scan.pending, { count: pendingCount })}
        </>
      )}
    </div>
  )
}

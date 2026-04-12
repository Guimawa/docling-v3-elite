import { motion, useReducedMotion } from 'framer-motion'
import {
  Camera,
  Info,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react'
import { useMemo, useRef } from 'react'
import PageTransition from '@/components/PageTransition'
import { FEATURES } from '@/shared/config/features'
import BatchQueue from './components/BatchQueue'
import UploadZone from './components/UploadZone'
import { useScanUpload } from './hooks/useScanUpload'
import { interpolate, useAppI18n } from '@/shared/i18n/appI18n'

// Sections
import ScannerOverlay from './sections/ScannerOverlay'
import ScannerHeader from './sections/ScannerHeader'
import ScannerOfflineStatus from './sections/ScannerOfflineStatus'

import { Database } from 'lucide-react'

export default function ScanPage() {
  const t = useAppI18n()
  const prefersReducedMotion = useReducedMotion()
  const inputRef = useRef()

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open,
    folderInputRef,
    handleSelectFolder,
    handleFolderInputChange,
    startBatch,
    handleCameraFile,
    batchQueue,
    stats,
    totalProducts,
    removeFromQueue,
    clearQueue,
    cameraOverlay,
    pendingCount,
    syncInProgress,
    isOnline,
    etaSummary,
  } = useScanUpload()

  const showCameraCapture = useMemo(
    () => /Mobi|Android|iPhone|iPad/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    [],
  )

  const PIPELINE_STEPS = [
    { key: 'upload', label: t.scan.steps.upload, icon: UploadCloud },
    { key: 'ai', label: t.scan.steps.ai, icon: Sparkles },
    { key: 'validate', label: t.scan.steps.validate, icon: Zap },
    { key: 'save', label: t.scan.steps.save, icon: Database },
  ]

  const currentStepIdx = cameraOverlay
    ? PIPELINE_STEPS.findIndex((s) => s.key === cameraOverlay.step)
    : -1

  return (
    <PageTransition variant="scale">
      <div className="relative min-h-screen bg-transparent overflow-x-hidden grainy">
        <div className="aurora-bg opacity-30" aria-hidden="true">
          <div /><div /><div />
        </div>
        
        <ScannerOverlay 
          cameraOverlay={cameraOverlay} 
          PIPELINE_STEPS={PIPELINE_STEPS} 
          currentStepIdx={currentStepIdx} 
          prefersReducedMotion={prefersReducedMotion} 
          t={t} 
        />

        <ScannerHeader t={t} />

        <div className="relative z-0 mx-auto max-w-4xl px-4 pb-28 sm:px-5">
          <div className="glass-card mb-4 flex gap-3 px-4 py-3 text-xs leading-relaxed text-text-secondary" role="status">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <p>{FEATURES.SCAN_JOB_EXECUTION === 'queue' ? t.scan.queueModeHint : t.scan.inlineModeHint}</p>
          </div>

          <ScannerOfflineStatus isOnline={isOnline} pendingCount={pendingCount} syncInProgress={syncInProgress} t={t} />

          {batchQueue.length > 0 && (
            <div className="flex justify-end mb-3">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full border border-primary/20 bg-primary-pale px-3 py-1.5 text-xs font-bold text-primary shadow-xs">
                {stats.done}/{stats.total}
              </motion.span>
            </div>
          )}

          {etaSummary && (
            <div className="glass-card mb-4 px-4 py-3 text-xs text-text-secondary">
              <div className="font-semibold text-text-primary">
                {interpolate(t.scan.etaPreScan, { minutes: Math.max(1, Math.round(etaSummary.totalSeconds / 60)) })}
              </div>
              <div className="mt-1">
                {interpolate(t.scan.etaStatsLine, {
                  total: etaSummary.totalFiles,
                  pdfText: etaSummary.breakdown.pdf_text,
                  pdfImage: etaSummary.breakdown.pdf_image,
                  image: etaSummary.breakdown.image,
                })}
              </div>
            </div>
          )}

          {showCameraCapture && (
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                if (!inputRef?.current) return
                inputRef.current.accept = 'image/*'
                inputRef.current.setAttribute('capture', 'environment')
                inputRef.current.click()
              }}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-coral-btn py-4 text-base font-bold text-white shadow-amber-md transition-[box-shadow,transform] duration-200 hover:shadow-xl active:shadow-amber-sm sm:py-5 sm:text-lg"
            >
              <Camera size={26} /> {t.scan.takePhoto}
            </motion.button>
          )}

          <UploadZone getRootProps={getRootProps} getInputProps={getInputProps} isDragActive={isDragActive} open={open} onSelectFolder={handleSelectFolder} folderInputRef={folderInputRef} onFolderInputChange={handleFolderInputChange} />

          <BatchQueue batchQueue={batchQueue} stats={stats} totalProducts={totalProducts} removeFromQueue={removeFromQueue} clearQueue={clearQueue} startBatch={startBatch} etaSummary={etaSummary} />

          {showCameraCapture && <input ref={inputRef} type="file" className="hidden" onChange={handleCameraFile} />}
        </div>
      </div>
    </PageTransition>
  )
}

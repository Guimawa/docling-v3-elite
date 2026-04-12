import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ScannerOverlay({ cameraOverlay, PIPELINE_STEPS, currentStepIdx, prefersReducedMotion, t }) {
  if (!cameraOverlay) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-nav-sidebar-ink/90 p-6 backdrop-blur-2xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 w-full max-w-xs overflow-hidden rounded-3xl border border-white/15 bg-elevated/95 shadow-2xl ring-1 ring-white/10"
        >
          <img
            src={cameraOverlay.previewUrl}
            alt="Facture"
            className="w-full h-48 object-cover"
          />
        </motion.div>

        <div className="flex items-center gap-2 mb-6">
          {PIPELINE_STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === currentStepIdx
            const isDone = i < currentStepIdx || cameraOverlay.step === 'done'
            const isError = cameraOverlay.step === 'error' && i === currentStepIdx

            return (
              <div key={s.key} className="flex items-center gap-2">
                <motion.div
                  animate={
                    isActive && !prefersReducedMotion ? { scale: [1, 1.06, 1] } : {}
                  }
                  transition={
                    isActive && !prefersReducedMotion
                      ? { repeat: Infinity, duration: 1.4 }
                      : {}
                  }
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isError
                      ? 'border-error/80 bg-error-bg'
                      : isDone
                        ? 'border-primary bg-primary-pale'
                        : isActive
                          ? 'border-primary-medium bg-primary-pale shadow-amber-sm'
                          : 'border-border bg-elevated/90'
                  }`}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 size={18} className="text-primary" />
                  ) : isError ? (
                    <AlertCircle size={18} className="text-red-400" />
                  ) : (
                    <Icon
                      size={18}
                      className={isActive ? 'text-primary' : 'text-text-secondary'}
                    />
                  )}
                </motion.div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-6 rounded-full transition-colors duration-300 ${
                      i < currentStepIdx ? 'bg-gradient-coral-btn' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        <motion.p
          key={cameraOverlay.step}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-bold ${
            cameraOverlay.step === 'error'
              ? 'text-red-400'
              : cameraOverlay.step === 'done'
                ? 'text-primary'
                : 'text-text-secondary'
          }`}
        >
          {cameraOverlay.step === 'upload' && t.scan.overlay.upload}
          {cameraOverlay.step === 'ai' && t.scan.overlay.ai}
          {cameraOverlay.step === 'validate' && t.scan.overlay.validate}
          {cameraOverlay.step === 'save' && t.scan.overlay.save}
          {cameraOverlay.step === 'done' && t.scan.overlay.done}
          {cameraOverlay.step === 'error' &&
            (cameraOverlay.error || t.scan.overlay.unknownError)}
        </motion.p>

        {cameraOverlay.step !== 'error' && cameraOverlay.step !== 'done' && (
          <Loader2 size={24} className="mt-4 animate-spin text-primary-light" />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

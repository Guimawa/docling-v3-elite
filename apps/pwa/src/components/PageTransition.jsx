import { motion, useReducedMotion } from 'framer-motion'

/**
 * PageTransition - Animations de transition entre pages (UX 2026)
 *
 * Variants disponibles :
 * - 'fade' : Fondu simple
 * - 'slide' : Glissement depuis la droite
 * - 'slideUp' : Glissement depuis le bas
 * - 'scale' : Zoom + fade
 *
 * Usage :
 * <PageTransition variant="slide">
 *   <YourPageContent />
 * </PageTransition>
 */
export default function PageTransition({
  children,
  variant = 'slide',
  className = ''
}) {
  const shouldReduceMotion = useReducedMotion()

  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.3 }
    },
    slide: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { type: 'spring', stiffness: 300, damping: 25 }
    }
  }

  const config = variants[variant] || variants.slide
  const reducedConfig = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 1 },
    transition: { duration: 0 },
  }
  const finalConfig = shouldReduceMotion ? reducedConfig : config

  return (
    <motion.div
      initial={finalConfig.initial}
      animate={finalConfig.animate}
      exit={finalConfig.exit}
      transition={finalConfig.transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

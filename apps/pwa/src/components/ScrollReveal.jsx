import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

/**
 * ScrollReveal - Animation d'apparition au scroll (UX 2026)
 *
 * Déclenche l'animation lorsque l'élément entre dans le viewport.
 *
 * Props :
 * - variant: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale'
 * - delay: délai avant l'animation (secondes)
 * - once: true = animation une seule fois, false = rejoue à chaque scroll
 *
 * Usage :
 * <ScrollReveal variant="slideUp" delay={0.2}>
 *   <Card>...</Card>
 * </ScrollReveal>
 */
export default function ScrollReveal({
  children,
  variant = 'fadeIn',
  delay = 0,
  once = true,
  className = ''
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once,
    margin: '-50px' // Déclenche 50px avant d'entrer dans le viewport
  })

  const variants = {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 0.6,
          delay,
          ease: [0.25, 0.1, 0.25, 1]
        }
      }
    },
    slideUp: {
      hidden: { opacity: 0, y: 30 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          delay
        }
      }
    },
    slideLeft: {
      hidden: { opacity: 0, x: 30 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          delay
        }
      }
    },
    slideRight: {
      hidden: { opacity: 0, x: -30 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          delay
        }
      }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 25,
          delay
        }
      }
    }
  }

  const config = variants[variant] || variants.fadeIn

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={config}
      className={className}
    >
      {children}
    </motion.div>
  )
}

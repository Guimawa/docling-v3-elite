import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useRef } from 'react'

/**
 * MagneticButton - Bouton magnétique attiré par le curseur (UX 2026)
 *
 * L'élément suit le curseur avec un effet "magnétique" Premium.
 *
 * Props :
 * - strength: Force de l'attraction (0-1), défaut 0.3
 * - distance: Distance d'activation en pixels, défaut 100
 * - children: Contenu du bouton
 * - className: Classes CSS additionnelles
 * - onClick: Callback au clic
 *
 * Usage :
 * <MagneticButton strength={0.4} onClick={handleClick}>
 *   <Button>Hover me!</Button>
 * </MagneticButton>
 */
export default function MagneticButton({
  children,
  strength = 0.3,
  distance = 100,
  className = '',
  onClick,
  ...props
}) {
  const ref = useRef(null)

  // Motion values avec spring physics
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 15, mass: 0.1 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const handleMouseMove = (e) => {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const mouseX = e.clientX
    const mouseY = e.clientY

    const distanceFromCenter = Math.sqrt(
      Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
    )

    // Activer l'effet magnétique si dans la zone
    if (distanceFromCenter < distance) {
      const deltaX = (mouseX - centerX) * strength
      const deltaY = (mouseY - centerY) * strength

      x.set(deltaX)
      y.set(deltaY)
    }
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        x: springX,
        y: springY,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`inline-block ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}

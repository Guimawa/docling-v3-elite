import { useEffect, useRef, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useDoclingStore } from '@/store/useStore'
import {
  FileText,
  Receipt,
  Camera,
  Scan,
  Calculator,
  TrendingUp,
  Building2,
  HardHat,
  ShoppingCart,
  ClipboardList,
  Hammer,
  Package,
  DollarSign,
  FileCheck,
  Wrench
} from 'lucide-react'

// Floating PWA Icons Component
function FloatingPWAIcon({ icon: Icon, delay = 0, position }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.2, 1],
        y: [0, -20, 0],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
      className="absolute"
      style={{ left: position.x, top: position.y }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
        <Icon className="w-12 h-12 text-blue-400/60 relative z-10" />
      </div>
    </motion.div>
  )
}

// Animated Grid Background
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }} />
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(147, 51, 234, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(147, 51, 234, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
        animate={{ x: [0, 50], y: [0, 50] }}
        transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
    </div>
  )
}

// Particle System (Canvas 2D - Exact Code)
function ParticleSystem() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = []

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      })
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(59, 130, 246, 0.3)"
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

export default function GlobalBackground() {
  const appTheme = useDoclingStore(s => s.appTheme)
  const isIvory = appTheme === 'ivory'
  const prefersReducedMotion = useReducedMotion()

  const isMobile = useMemo(() => 
    typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent), 
    []
  )

  const icons = useMemo(() => {
    const allIcons = [
      { icon: Receipt, position: { x: "10%", y: "20%" }, delay: 0 },
      { icon: Camera, position: { x: "85%", y: "15%" }, delay: 0.5 },
      { icon: Scan, position: { x: "15%", y: "70%" }, delay: 1 },
      { icon: Calculator, position: { x: "80%", y: "65%" }, delay: 1.5 },
      { icon: Building2, position: { x: "50%", y: "10%" }, delay: 2 },
      { icon: HardHat, position: { x: "90%", y: "85%" }, delay: 2.5 },
      { icon: ShoppingCart, position: { x: "20%", y: "50%" }, delay: 3 },
      { icon: Package, position: { x: "75%", y: "40%" }, delay: 3.5 },
      { icon: TrendingUp, position: { x: "30%", y: "85%" }, delay: 4 },
      { icon: FileCheck, position: { x: "5%", y: "45%" }, delay: 4.5 },
      { icon: Hammer, position: { x: "92%", y: "50%" }, delay: 5 },
      { icon: DollarSign, position: { x: "45%", y: "75%" }, delay: 5.5 },
      { icon: ClipboardList, position: { x: "65%", y: "20%" }, delay: 6 },
      { icon: Wrench, position: { x: "12%", y: "90%" }, delay: 6.5 },
      { icon: FileText, position: { x: "88%", y: "30%" }, delay: 7 },
    ]
    // Reduce icon count on mobile to boost performance
    return isMobile ? allIcons.slice(0, 5) : allIcons
  }, [isMobile])

  return (
    <div className={`fixed inset-0 z-[0] pointer-events-none overflow-hidden transition-colors duration-700 ${
      isIvory 
        ? 'bg-gradient-to-br from-[#f7f9fb] via-[#f1f5f9] to-[#f7f9fb]' 
        : 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950'
    }`}>
      <AnimatedGrid />
      {!prefersReducedMotion && <ParticleSystem />}
      
      {/* Floating PWA Icons */}
      <div className={isIvory ? 'opacity-20 blend-darken' : ''}>
        {icons.map((item, index) => (
          <FloatingPWAIcon key={index} icon={item.icon} position={item.position} delay={item.delay} />
        ))}
      </div>

      {/* Dynamic Glow Orbs */}
      <div className="absolute inset-0">
        <motion.div
          className={`absolute w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${isIvory ? 'bg-blue-100/10' : 'bg-blue-500/20'}`}
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          style={{ left: "20%", top: "30%" }}
        />
        <motion.div
          className={`absolute w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${isIvory ? 'bg-slate-200/5' : 'bg-purple-500/20'}`}
          animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ right: "20%", bottom: "30%" }}
        />
      </div>
      
      <div className={`absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent transition-colors duration-700 ${isIvory ? 'from-[#f7f9fb]' : 'from-slate-950'}`} />
    </div>
  )
}

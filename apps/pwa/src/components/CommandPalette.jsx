import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  CheckCircle2,
  Clock,
  HelpCircle,
  Home,
  PackageSearch,
  Settings,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const COMMANDS = [
  { id: 'home', label: 'Accueil (marketing)', path: '/', icon: Home },
  { id: 'scan', label: 'Scanner', path: '/scan', icon: Camera },
  { id: 'validation', label: 'Validation', path: '/validation', icon: CheckCircle2 },
  { id: 'catalogue', label: 'Catalogue', path: '/catalogue', icon: PackageSearch },
  { id: 'history', label: 'Historique', path: '/history', icon: Clock },
  { id: 'settings', label: 'Paramètres', path: '/settings', icon: Settings },
  { id: 'aide', label: 'Aide (site)', path: '/aide', icon: HelpCircle },
]

const PALETTE_TITLE_ID = 'command-palette-title'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  const listboxRef = useRef(null)
  const lastFocusOutsideRef = useRef(null)

  useEffect(() => {
    if (!open) return
    lastFocusOutsideRef.current = document.activeElement
    const id = requestAnimationFrame(() => {
      listboxRef.current?.focus()
    })
    return () => {
      cancelAnimationFrame(id)
      const el = lastFocusOutsideRef.current
      if (el && typeof el.focus === 'function') {
        try {
          el.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
        setSelected(0)
        return
      }
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  const handleListKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      listboxRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, COMMANDS.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setSelected(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      setSelected(COMMANDS.length - 1)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = COMMANDS[selected]
      if (cmd) {
        navigate(cmd.path)
        setOpen(false)
      }
    }
  }

  const handleSelect = (cmd) => {
    navigate(cmd.path)
    setOpen(false)
  }

  const activeDescendantId = `command-palette-${COMMANDS[selected]?.id ?? 'home'}`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[15vh]"
        >
          {/* Voile séparé du dialogue : pas d’ancêtre aria-hidden autour du role="dialog" */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={PALETTE_TITLE_ID}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-stone-100 shadow-2xl"
          >
            <div className="border-b border-border px-4 py-3">
              <p
                id={PALETTE_TITLE_ID}
                className="text-xs font-bold uppercase tracking-widest text-text-secondary"
              >
                Navigation rapide
              </p>
            </div>
            <div
              ref={listboxRef}
              role="listbox"
              tabIndex={0}
              aria-labelledby={PALETTE_TITLE_ID}
              aria-activedescendant={activeDescendantId}
              onKeyDown={handleListKeyDown}
              className="max-h-72 overflow-y-auto py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
            >
              {COMMANDS.map((cmd, i) => {
                const Icon = cmd.icon
                const isSelected = i === selected
                return (
                  <motion.div
                    key={cmd.id}
                    id={`command-palette-${cmd.id}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    onClick={() => handleSelect(cmd)}
                    onMouseEnter={() => setSelected(i)}
                    className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors
                      ${isSelected ? 'bg-primary/15 text-primary' : 'text-text-primary hover:bg-surface/80'}`}
                  >
                    <Icon size={18} className={isSelected ? 'text-primary' : 'text-text-secondary'} />
                    <span className="text-sm font-semibold">{cmd.label}</span>
                  </motion.div>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-2xs text-text-secondary">
              <span>↑↓ naviguer</span>
              <span>↵ sélectionner</span>
              <span>Esc fermer</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

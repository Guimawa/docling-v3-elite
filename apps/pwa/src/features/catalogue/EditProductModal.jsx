import { AnimatePresence, motion } from 'framer-motion'
import { X, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Select from '@/components/Select'
import Card from '@/components/Card'
import { FAMILLES_AVEC_TOUTES } from '@/constants/categories'
import apiClient from '@/shared/lib/apiClient'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const EDIT_MODAL_TITLE_ID = 'edit-product-modal-title'

/**
 * Modal d'édition de produit avec animations Premium 2026
 * - Glassmorphism backdrop
 * - Spring physics
 * - Magnetic close button
 * - Smooth transitions
 */
export default function EditProductModal({ isOpen, onClose, product, onSave }) {
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      const el = previousFocusRef.current
      if (el && typeof el.focus === 'function') {
        try {
          el.focus()
        } catch {
          /* ignore */
        }
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !product) return
    const id = requestAnimationFrame(() => {
      const root = dialogRef.current
      const first = root?.querySelector(FOCUSABLE)
      first?.focus?.()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, product])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = [...dialog.querySelectorAll(FOCUSABLE)]
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  useEffect(() => {
    if (product) {
      setFormData({
        designation_fr: product.designation_fr || '',
        designation_raw: product.designation_raw || '',
        famille: product.famille || 'Béton',
        fournisseur: product.fournisseur || '',
        unite: product.unite || 'u',
        prix_brut_ht: product.prix_brut_ht || 0,
        remise_pct: product.remise_pct || 0,
        prix_remise_ht: product.prix_remise_ht || 0,
        prix_ttc_remise: product.prix_ttc_remise ?? product.prix_ttc_iva21 ?? 0,
        prix_ttc_non_remise: product.prix_ttc_non_remise || 0,
        prix_ttc_iva21: product.prix_ttc_iva21 || 0,
        prix_conseille_vente: product.prix_conseille_vente ?? '',
      })
    }
  }, [product])

  // Magnetic effect for close button
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    })
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!product?.id) return

    setSaving(true)
    try {
      const conseilleRaw = formData.prix_conseille_vente
      const conseilleStr = typeof conseilleRaw === 'string' ? conseilleRaw.trim() : String(conseilleRaw ?? '')
      const conseille = conseilleStr === '' ? null : parseFloat(conseilleStr.replace(',', '.'))
      const payload = {
        ...formData,
        prix_conseille_vente: Number.isFinite(conseille) && conseille > 0 ? conseille : null,
      }

      const response = await apiClient.put(`/api/v1/catalogue/${product.id}`, payload)

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([10, 30, 10])
      }

      toast.success('Produit modifié avec succès')
      onSave?.(response.data)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification')
    } finally {
      setSaving(false)
    }
  }

  if (!product) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(4px)' }}
            exit={{ backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={EDIT_MODAL_TITLE_ID}
            className="relative z-10 w-full max-w-2xl"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
          <Card
            as={motion.div}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-2xl"
          >
            {/* Magnetic Close Button */}
            <motion.button
              type="button"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center
                rounded-xl border border-border bg-stone-100 hover:border-red-500/50 hover:bg-red-600/20
                text-text-secondary transition-colors hover:text-red-400"
              style={{
                transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)`,
              }}
            >
              <X size={18} />
            </motion.button>

            {/* Header */}
            <div className="mb-6">
              <h2 id={EDIT_MODAL_TITLE_ID} className="mb-1 text-2xl font-black text-text-primary">
                Éditer le produit
              </h2>
              <p className="text-sm text-text-secondary">
                Modifiez les informations du produit
              </p>
            </div>

            {/* Form Grid */}
            <div className="space-y-4">
              {/* Designation FR */}
              <Input
                id="edit-designation-fr"
                label="Désignation FR"
                value={formData.designation_fr || ''}
                onChange={(e) => handleChange('designation_fr', e.target.value)}
                placeholder="Ex: Béton C25/30"
                className="border-border bg-stone-100 text-text-primary"
              />

              {/* Designation RAW */}
              <Input
                id="edit-designation-raw"
                label="Désignation brute"
                value={formData.designation_raw || ''}
                onChange={(e) => handleChange('designation_raw', e.target.value)}
                placeholder="Désignation d'origine"
                className="border-border bg-stone-100 text-text-primary"
              />

              {/* Row: Famille + Fournisseur */}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  id="edit-famille"
                  label="Famille"
                  value={formData.famille || 'Béton'}
                  onChange={(e) => handleChange('famille', e.target.value)}
                  className="border-border bg-stone-100 text-text-primary"
                >
                  {FAMILLES_AVEC_TOUTES.filter(f => f !== 'Toutes').map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>

                <Input
                  id="edit-fournisseur"
                  label="Fournisseur"
                  value={formData.fournisseur || ''}
                  onChange={(e) => handleChange('fournisseur', e.target.value)}
                  placeholder="Ex: CEMEX"
                  className="border-border bg-stone-100 text-text-primary"
                />
              </div>

              {/* Row: Prix Brut + Remise + Unité */}
              <div className="grid grid-cols-3 gap-4">
                <Input
                  id="edit-prix-brut"
                  label="Prix Brut HT (€)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prix_brut_ht || 0}
                  onChange={(e) => handleChange('prix_brut_ht', parseFloat(e.target.value) || 0)}
                  className="border-border bg-stone-100 text-text-primary"
                />

                <Input
                  id="edit-remise"
                  label="Remise (%)"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.remise_pct || 0}
                  onChange={(e) => handleChange('remise_pct', parseFloat(e.target.value) || 0)}
                  className="border-border bg-stone-100 text-text-primary"
                />

                <Input
                  id="edit-unite"
                  label="Unité"
                  value={formData.unite || 'u'}
                  onChange={(e) => handleChange('unite', e.target.value)}
                  placeholder="u, m³, T..."
                  className="border-border bg-stone-100 text-text-primary"
                />
              </div>

              {/* Row: Prix Net HT */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="edit-prix-net"
                  label="Prix Net HT (€)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prix_remise_ht || 0}
                  onChange={(e) => handleChange('prix_remise_ht', parseFloat(e.target.value) || 0)}
                  className="border-border bg-stone-100 text-text-primary"
                />
              </div>

              {/* TTC remisé / sans remise + legacy IVA21 (aligné TTC remisé côté API) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  id="edit-prix-ttc-remise"
                  label="Prix TTC remisé (€)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prix_ttc_remise || 0}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0
                    handleChange('prix_ttc_remise', v)
                    handleChange('prix_ttc_iva21', v)
                  }}
                  className="border-border bg-stone-100 text-text-primary"
                />
                <Input
                  id="edit-prix-ttc-non-remise"
                  label="Prix TTC sans remise (€)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.prix_ttc_non_remise || 0}
                  onChange={(e) => handleChange('prix_ttc_non_remise', parseFloat(e.target.value) || 0)}
                  className="border-border bg-stone-100 text-text-primary"
                />
                <Input
                  id="edit-prix-conseille"
                  label="Prix de vente conseillé (€)"
                  type="text"
                  inputMode="decimal"
                  value={formData.prix_conseille_vente === null || formData.prix_conseille_vente === undefined ? '' : String(formData.prix_conseille_vente)}
                  onChange={(e) => handleChange('prix_conseille_vente', e.target.value)}
                  placeholder="Optionnel"
                  className="border-border bg-stone-100 text-text-primary"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
              <Button
                onClick={onClose}
                variant="ghost"
                className="flex-1 border border-border bg-stone-100 text-text-primary hover:bg-stone-200"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                isLoading={saving}
                variant="primary"
                className="flex-1 bg-primary hover:bg-cta-hover"
              >
                {!saving && <Save size={16} />}
                Enregistrer
              </Button>
            </div>
          </Card>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

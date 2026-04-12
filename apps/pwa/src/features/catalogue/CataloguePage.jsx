import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence, motion } from 'framer-motion'
import { PackageSearch, Search, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// UI & Components
import PageTransition from '@/components/PageTransition'
import SkeletonCard from '@/shared/ui/SkeletonCard'
import EmptyStateIllustration from '@/shared/ui/EmptyStateIllustration'
import ProductCard from './components/ProductCard'
import ProductSheet from './ProductSheet'
import EditProductModal from './EditProductModal'
import CompareModal from './CompareModal'

// Hooks & Store
import { interpolate, useAppI18n } from '@/shared/i18n/appI18n'
import {
  catalogueSearchActive,
  catalogueProductsQueryKey,
  CATALOGUE_PAGE_LIMIT,
  CATALOGUE_Q_MIN_LENGTH,
  invalidateCatalogueQueries,
  useCatalogueFacetOptions,
  useCatalogueProducts,
  useFilterParams,
} from './useCatalogueFacets'

// Sections
import CatalogueHeader from './sections/CatalogueHeader'
import CatalogueFilters from './sections/CatalogueFilters'

const FAMILLE_EMOJI = {
  Plomberie: '🔧', Électricité: '⚡', Carrelage: '⬛', Maçonnerie: '🧱',
  Outillage: '🪛', Peinture: '🎨', Menuiserie: '🚪',
}

function FamilleChipLabel({ name }) {
  const emoji = FAMILLE_EMOJI[name]
  return <span>{emoji ? `${emoji} ${name}` : name}</span>
}

async function exportCSV(data, t) {
  const c = t.catalogue.columns
  const headers = [c.designation, c.family, c.supplier, c.unit, c.gross, c.discount, c.net, c.ttc, c.ttcRemise, c.ttcNonRemise, c.recommendedSale]
  const rows = data.map(p => [p.designation_fr, p.famille, p.fournisseur, p.unite, p.prix_brut_ht, p.remise_pct, p.prix_remise_ht, p.prix_ttc_iva21, p.prix_ttc_remise ?? p.prix_ttc_iva21, p.prix_ttc_non_remise, p.prix_conseille_vente])
  const csv = [headers, ...rows].map(r => r.map(c => {
    const s = String(c ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `catalogue_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(a.href)
}

async function exportExcel(data, t) {
  const c = t.catalogue.columns
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Catalogue BTP', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = [
    { header: c.designation, key: 'designation_fr', width: 40 }, { header: c.family, key: 'famille', width: 16 },
    { header: c.supplier, key: 'fournisseur', width: 22 }, { header: c.unit, key: 'unite', width: 8 },
    { header: c.gross, key: 'prix_brut_ht', width: 14 }, { header: c.discount, key: 'remise_pct', width: 10 },
    { header: c.net, key: 'prix_remise_ht', width: 14 }, { header: c.ttc, key: 'prix_ttc_iva21', width: 14 },
    { header: c.ttcRemise, key: 'prix_ttc_remise', width: 14 }, { header: c.ttcNonRemise, key: 'prix_ttc_non_remise', width: 16 },
    { header: c.recommendedSale, key: 'prix_conseille_vente', width: 18 },
  ]
  ws.addRows(data.map(p => ({ ...p, prix_ttc_remise: p.prix_ttc_remise ?? p.prix_ttc_iva21 })))
  const buf = await wb.xlsx.writeBuffer()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = `catalogue_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click(); URL.revokeObjectURL(a.href)
}

export default function CataloguePage() {
  const t = useAppI18n()
  const queryClient = useQueryClient()
  const { filters, setFilter, resetAll: resetUrlParams, activeCount } = useFilterParams()
  const [expandedFilter, setExpandedFilter] = useState(null)
  const [searchInput, setSearchInput] = useState(filters.q)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const compareTriggerRef = useRef(null)
  const parentRef = useRef(null)
  const debounceRef = useRef(null)

  const facetOptionsQuery = useCatalogueFacetOptions(filters)
  const productsQuery = useCatalogueProducts(filters, { limit: CATALOGUE_PAGE_LIMIT, offset: 0 })
  const facets = facetOptionsQuery.data ?? {}
  const catalogueTotal = facets.total ?? 0
  const products = productsQuery.data?.products ?? []
  const total = productsQuery.data?.total ?? 0
  
  const searchActive = catalogueSearchActive(filters)
  const loadingProducts = searchActive && (productsQuery.isPending || (productsQuery.isFetching && products.length === 0))

  useEffect(() => { setSearchInput(filters.q) }, [filters.q])
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed.length >= CATALOGUE_Q_MIN_LENGTH) setFilter('q', trimmed)
      else if (trimmed.length === 0) setFilter('q', '')
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput, setFilter])

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 8,
  })

  const handleProductSave = useCallback((updated) => {
    const uid = Number(updated?.id)
    if (!Number.isFinite(uid)) return
    queryClient.setQueryData(catalogueProductsQueryKey(filters, CATALOGUE_PAGE_LIMIT, 0), (old) => {
      if (!old?.products) return old
      return { ...old, products: old.products.map(p => Number(p.id) === uid ? { ...p, ...updated } : p) }
    })
    setSelectedProduct(prev => Number(prev?.id) === uid ? { ...prev, ...updated } : prev)
    void invalidateCatalogueQueries(queryClient)
  }, [queryClient, filters])

  const resultsHint = useMemo(() => {
    if (!searchActive) return (catalogueTotal === 0 && facetOptionsQuery.isFetched) ? t.catalogue.resultsZero : ''
    if (loadingProducts) return t.catalogue.searching
    return interpolate(t.catalogue.resultsCount, { count: total, plural: total > 1 ? 's' : '' })
  }, [searchActive, catalogueTotal, facetOptionsQuery.isFetched, loadingProducts, total, t])

  const decorateFamille = useCallback((opt) => <FamilleChipLabel name={opt} />, [])

  const sousList = facets.sous_familles ?? []
  const typesList = facets.types_produit ?? []
  const variantesList = facets.variantes ?? []
  const dimensionsList = facets.dimensions ?? []
  const fam = Boolean(filters.famille)
  const pathSouOk = fam && (sousList.length === 0 || Boolean(filters.sous_famille))
  const pathTypeOk = pathSouOk && (typesList.length === 0 || Boolean(filters.type_produit))
  const pathVarOk = pathTypeOk && (variantesList.length === 0 || Boolean(filters.variante))

  return (
    <PageTransition variant="slide">
      <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-transparent text-text-primary">
        <CatalogueHeader products={products} exportExcel={exportExcel} exportCSV={exportCSV} setCompareOpen={setCompareOpen} compareTriggerRef={compareTriggerRef} t={t} />

        <div className="page mx-auto w-full max-w-[580px] space-y-3 px-4 sm:px-5 pb-3">
          <div className="search-box flex min-h-[48px] items-center gap-3 rounded-full border border-border-medium bg-elevated px-4 py-2 shadow-xs ring-1 ring-black/[0.03]">
            <Search size={18} className="shrink-0 text-text-tertiary" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t.catalogue.searchPlaceholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-text-primary outline-none" />
            {searchInput && <button onClick={() => { setSearchInput(''); setFilter('q', '') }}><X size={14}/></button>}
          </div>
        </div>

        <CatalogueFilters 
          filters={filters} setFilter={setFilter} facets={facets} expandedFilter={expandedFilter} setExpandedFilter={setExpandedFilter}
          showSousFamille={fam && sousList.length > 0} 
          showType={fam && pathSouOk && typesList.length > 0}
          showVariante={fam && pathSouOk && pathTypeOk && variantesList.length > 0}
          showDimension={fam && pathSouOk && pathTypeOk && pathVarOk && dimensionsList.length > 0}
          sousList={sousList} typesList={typesList} variantesList={variantesList} dimensionsList={dimensionsList}
          loadingFacets={facetOptionsQuery.isFetching} activeCount={activeCount} resetAll={() => { resetUrlParams(); setSearchInput(''); setExpandedFilter(null) }}
          decorateFamille={decorateFamille} t={t}
        />

        <main className="results-area relative z-0 mx-auto w-full max-w-[580px] flex-1 px-4 pb-10 sm:px-5">
          <div className="results-header mb-2 flex items-center justify-between">
            <span className="results-count text-sm text-text-secondary">{resultsHint}</span>
          </div>

          {!loadingProducts && !searchActive && facetOptionsQuery.isSuccess && catalogueTotal === 0 ? (
            <div className="flex flex-col items-center gap-5 py-12 text-center">
              <div className="w-full max-w-[160px] opacity-60"><EmptyStateIllustration className="w-full" /></div>
              <p className="font-semibold text-text-primary">{t.catalogue.empty.title}</p>
            </div>
          ) : !loadingProducts && !searchActive && catalogueTotal > 0 ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-full max-w-[140px] opacity-50"><EmptyStateIllustration className="w-full" /></div>
              <p className="max-w-[320px] text-sm text-text-secondary">{t.catalogue.promptSearch}</p>
            </div>
          ) : null}

          {loadingProducts && <SkeletonCard count={6} variant="catalogue" />}

          {!loadingProducts && products.length > 0 && (
            <div ref={parentRef} className="product-list overflow-auto" style={{ height: 'calc(100vh - 320px)' }}>
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map(vRow => (
                  <div key={products[vRow.index].id} ref={virtualizer.measureElement} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vRow.start}px)` }} className="pb-1.5">
                    <ProductCard p={products[vRow.index]} t={t} onClick={() => setSelectedProduct(products[vRow.index])} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loadingProducts && searchActive && products.length === 0 && productsQuery.isSuccess && (
            <div className="py-12 text-center text-text-secondary">{t.catalogue.empty.noResult}</div>
          )}
        </main>

        <AnimatePresence>
          {selectedProduct && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setSelectedProduct(null)} />}
          {selectedProduct && <ProductSheet product={selectedProduct} onClose={() => setSelectedProduct(null)} onEdit={p => { setSelectedProduct(null); setEditingProduct(p) }} onCompare={() => setCompareOpen(true)} />}
        </AnimatePresence>

        <EditProductModal isOpen={editingProduct !== null} onClose={() => setEditingProduct(null)} product={editingProduct} onSave={handleProductSave} />
        <CompareModal isOpen={compareOpen} onClose={() => setCompareOpen(false)} triggerRef={compareTriggerRef} />
      </div>
    </PageTransition>
  )
}

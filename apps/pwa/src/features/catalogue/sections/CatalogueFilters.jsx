import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Building2, Tag, RefreshCw } from 'lucide-react'
import FilterAccordion from '../components/FilterAccordion'
import CascadeLevel from '../components/CascadeLevel'
import FilterPathChips from '../components/FilterPathChips'

export default function CatalogueFilters({ 
  filters, setFilter, facets, expandedFilter, setExpandedFilter, 
  showSousFamille, showType, showVariante, showDimension, 
  sousList, typesList, variantesList, dimensionsList,
  loadingFacets, activeCount, resetAll, decorateFamille, t 
}) {
  return (
    <div className="page mx-auto max-w-[580px] space-y-3 px-4 sm:px-5">
      <div className="filters-wrap flex flex-col gap-3" aria-busy={loadingFacets}>
        {loadingFacets && <RefreshCw size={14} className="animate-spin text-text-secondary" />}
        <FilterAccordion
          groupKey="fournisseur" title="Fournisseur" subtitleEmpty="Tous les fournisseurs" icon={Building2}
          selected={filters.fournisseur} options={facets.fournisseurs || []}
          expandedKey={expandedFilter} onExpand={setExpandedFilter}
          onSelect={v => setFilter('fournisseur', v)} onClear={() => setFilter('fournisseur', '')}
        />
        <FilterAccordion
          groupKey="famille" title="Famille" subtitleEmpty="Toutes les familles" icon={Tag}
          selected={filters.famille} options={facets.familles || []}
          expandedKey={expandedFilter} onExpand={setExpandedFilter}
          onSelect={v => setFilter('famille', v)} onClear={() => setFilter('famille', '')}
          decorateOption={decorateFamille}
        />
      </div>

      <FilterPathChips filters={filters} setFilter={setFilter} t={t} />

      {filters.famille && sousList.length === 0 && (
        <p className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-xs text-text-secondary">
          {t.catalogue.cascadeSkipSousHint}
        </p>
      )}

      <div className="cascade-wrap flex flex-col">
        <AnimatePresence initial={false} mode="popLayout">
          {showSousFamille && <CascadeLevel key="cascade-sous_famille" label={t.catalogue.cascadeMaterial} values={sousList} selected={filters.sous_famille} onSelect={v => setFilter('sous_famille', v)} />}
          {showType && <CascadeLevel key="cascade-type_produit" label={t.catalogue.cascadeType} values={typesList} selected={filters.type_produit} onSelect={v => setFilter('type_produit', v)} />}
          {showVariante && <CascadeLevel key="cascade-variante" label={t.catalogue.cascadeVariant} values={variantesList} selected={filters.variante} onSelect={v => setFilter('variante', v)} />}
          {showDimension && <CascadeLevel key="cascade-dimension" label={t.catalogue.cascadeDimension} values={dimensionsList} selected={filters.dimension} onSelect={v => setFilter('dimension', v)} />}
        </AnimatePresence>
      </div>

      {activeCount > 0 && (
        <button type="button" onClick={resetAll} className="reset-btn mx-auto block rounded-full border border-border-dark bg-transparent px-5 py-2.5 text-center text-xs font-semibold text-text-primary transition-colors hover:bg-surface">
          ✕ Réinitialiser les filtres
        </button>
      )}
    </div>
  )
}

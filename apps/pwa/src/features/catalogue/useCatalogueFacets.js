/**
 * TanStack Query v5 — facettes (options de filtres) + recherche catalogue (URL = source de vérité).
 * Les facettes ignorent `q` : les listes fournisseur / famille / … reflètent le catalogue réel.
 * Les produits ne sont chargés que si recherche texte ≥ 2 caractères (aligné API) ou filtre structurel actif.
 */
import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import apiClient from '@/shared/lib/apiClient'

/** Même seuil que `apps/api/domains/catalogue/facets.py` (`_facet_where` sur q). */
export const CATALOGUE_Q_MIN_LENGTH = 2

function structuralFilters(filters) {
  return {
    fournisseur: filters.fournisseur || '',
    famille: filters.famille || '',
    sous_famille: filters.sous_famille || '',
    type_produit: filters.type_produit || '',
    variante: filters.variante || '',
    dimension: filters.dimension || '',
  }
}

/** True si la recherche produits doit appeler l’API (pas de liste “tableau” au chargement). */
export function catalogueSearchActive(filters) {
  const q = (filters.q || '').trim()
  if (q.length >= CATALOGUE_Q_MIN_LENGTH) return true
  const s = structuralFilters(filters)
  return Boolean(
    s.fournisseur
    || s.famille
    || s.sous_famille
    || s.type_produit
    || s.variante
    || s.dimension,
  )
}

function countActiveFilters(filters) {
  const s = structuralFilters(filters)
  let n = 0
  for (const k of Object.keys(s)) {
    if (s[k]) n++
  }
  if ((filters.q || '').trim().length >= CATALOGUE_Q_MIN_LENGTH) n++
  return n
}

/** Clé requête facettes (sans q) — options des accordéons. */
export function catalogueFacetsStructuralQueryKey(f) {
  const s = structuralFilters(f)
  return [
    'catalogue-facets-structural',
    s.fournisseur,
    s.famille,
    s.sous_famille,
    s.type_produit,
    s.variante,
    s.dimension,
  ]
}

export function catalogueProductsQueryKey(f, limit, offset) {
  return [
    'catalogue-products',
    f.q || '',
    f.fournisseur || '',
    f.famille || '',
    f.sous_famille || '',
    f.type_produit || '',
    f.variante || '',
    f.dimension || '',
    limit,
    offset,
  ]
}

/**
 * Après mutation catalogue (PUT, batch, etc.) : refetch facettes + listes,
 * sinon les accordéons restent sur staleTime sans les nouveaux fournisseurs/familles.
 */
export function invalidateCatalogueQueries(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['catalogue-facets-structural'] }),
    queryClient.invalidateQueries({ queryKey: ['catalogue-products'] }),
  ])
}

export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      fournisseur: searchParams.get('fournisseur') || '',
      famille: searchParams.get('famille') || '',
      sous_famille: searchParams.get('sous_famille') || '',
      type_produit: searchParams.get('type_produit') || '',
      variante: searchParams.get('variante') || '',
      dimension: searchParams.get('dimension') || '',
    }),
    [searchParams],
  )

  const setFilter = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)

      const cascade = ['famille', 'sous_famille', 'type_produit', 'variante', 'dimension']
      const idx = cascade.indexOf(key)
      if (idx !== -1) cascade.slice(idx + 1).forEach(k => next.delete(k))

      return next
    })
  }, [setSearchParams])

  const resetAll = useCallback(() => setSearchParams({}), [setSearchParams])

  const activeCount = countActiveFilters(filters)

  return { filters, setFilter, resetAll, activeCount }
}

/** Facettes pour les filtres : sans `q`, pour que les options suivent le catalogue (et la cascade). */
export function useCatalogueFacetOptions(filters) {
  const structural = structuralFilters(filters)

  return useQuery({
    queryKey: catalogueFacetsStructuralQueryKey(structural),
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(structural).filter(([, v]) => v))
      const { data } = await apiClient.get('/api/v1/catalogue/facets', { params })
      return data
    },
    staleTime: 30_000,
    gcTime: 120_000,
    placeholderData: prev => prev,
  })
}

const CATALOGUE_PAGE_LIMIT = 200

export function useCatalogueProducts(filters, { limit = CATALOGUE_PAGE_LIMIT, offset = 0 } = {}) {
  const enabled = catalogueSearchActive(filters)

  return useQuery({
    queryKey: catalogueProductsQueryKey(filters, limit, offset),
    queryFn: async () => {
      const params = {
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        limit,
        offset,
      }
      const { data } = await apiClient.get('/api/v1/catalogue/search', { params })
      return data
    },
    enabled,
    staleTime: 15_000,
    placeholderData: prev => prev,
  })
}

export { CATALOGUE_PAGE_LIMIT }

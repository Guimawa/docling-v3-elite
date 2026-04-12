/**
 * dedupService.js
 * Detection de doublons produit: designation (fuzzy) + fournisseur (exact/proche)
 */

const SEUIL_DESIGNATION = 0.85
const SEUIL_FOURNISSEUR = 0.9

function normalize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(?<=\d)(?=[a-z])/g, ' ')
    .replace(/(?<=[a-z])(?=\d)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenSimilarity(a, b) {
  const tokA = new Set(normalize(a).split(' ').filter(Boolean))
  const tokB = new Set(normalize(b).split(' ').filter(Boolean))
  if (tokA.size === 0 && tokB.size === 0) return 1
  if (tokA.size === 0 || tokB.size === 0) return 0
  let inter = 0
  for (const t of tokA) if (tokB.has(t)) inter++
  return inter / Math.max(tokA.size, tokB.size)
}

function levenshtein(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  const m = na.length
  const n = nb.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        na[i - 1] === nb[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function levSimilarity(a, b) {
  const na = normalize(a)
  const nb = normalize(b)
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

export function designationScore(a, b) {
  const tokSim = tokenSimilarity(a, b)
  const levSim = levSimilarity(a, b)
  return Math.max(tokSim, levSim * 0.8)
}

export function fournisseurScore(a, b) {
  return levSimilarity(a, b)
}

export function checkDuplicate(product, catalogue) {
  if (!catalogue || catalogue.length === 0) {
    return { isDuplicate: false, match: null, scores: null }
  }

  let bestMatch = null
  let bestScore = { designation: 0, fournisseur: 0 }

  for (const existing of catalogue) {
    const dScore = designationScore(product.designation_fr, existing.designation_fr)
    const fScore = fournisseurScore(product.fournisseur, existing.fournisseur)
    if (
      dScore >= SEUIL_DESIGNATION &&
      fScore >= SEUIL_FOURNISSEUR &&
      dScore + fScore > bestScore.designation + bestScore.fournisseur
    ) {
      bestMatch = existing
      bestScore = { designation: dScore, fournisseur: fScore }
    }
  }

  return {
    isDuplicate: bestMatch !== null,
    match: bestMatch,
    scores: bestMatch ? bestScore : null,
  }
}

export function markNewProducts(products, catalogue) {
  return products.map((product) => {
    const { isDuplicate, match, scores } = checkDuplicate(product, catalogue)
    return {
      ...product,
      is_new: !isDuplicate,
      _dupMatch: match,
      _dupScores: scores,
    }
  })
}

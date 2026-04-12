/**
 * Web Vitals — Core Web Metrics (CLS, INP, LCP, FCP, TTFB)
 * Dev: console.log avec emoji
 * Prod: navigator.sendBeacon('/api/vitals', data)
 */
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'
import { API_BASE_URL } from '@/shared/config/api'

const isDev = import.meta.env.DEV
const BUDGETS = {
  CLS: 0.1,
  INP: 200,
  LCP: 2500,
  FCP: 1800,
}

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  })

  if (isDev) {
    const emoji = {
      CLS: '📐',
      INP: '👆',
      LCP: '🖼️',
      FCP: '🎨',
      TTFB: '⏱️',
    }[metric.name] || '📊'
    console.log(`${emoji} [Web Vitals] ${metric.name}:`, metric.value, `(${metric.rating})`)
    if (BUDGETS[metric.name] && metric.value > BUDGETS[metric.name]) {
      console.warn(
        `[Web Vitals Budget] ${metric.name} dépasse le budget (${metric.value} > ${BUDGETS[metric.name]})`
      )
    }
  } else {
    const base = (API_BASE_URL || '').trim()
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    const url = (base.startsWith('http') && !isLocalhost) ? `${base.replace(/\/+$/, '')}/api/vitals` : null
    if (url) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
    }
  }
}

export function measureWebVitals() {
  onCLS(sendToAnalytics)
  onINP(sendToAnalytics)
  onLCP(sendToAnalytics)
  onFCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

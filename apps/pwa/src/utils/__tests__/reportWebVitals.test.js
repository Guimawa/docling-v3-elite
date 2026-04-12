import { beforeEach, describe, expect, test, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('web-vitals', () => ({
  onCLS:  vi.fn(),
  onINP:  vi.fn(),
  onLCP:  vi.fn(),
  onFCP:  vi.fn(),
  onTTFB: vi.fn(),
}))

vi.mock('@/shared/config/api', () => ({
  API_BASE_URL: 'https://api.docling.app',
}))

// jsdom n'a pas navigator.sendBeacon — on l'ajoute manuellement
if (!navigator.sendBeacon) {
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
    configurable: true,
  })
}

import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals'
import { measureWebVitals } from '../reportWebVitals'

describe('measureWebVitals', () => {
  beforeEach(() => { vi.clearAllMocks() })

  test('registers all 5 web vitals observers', () => {
    measureWebVitals()
    expect(onCLS).toHaveBeenCalledOnce()
    expect(onINP).toHaveBeenCalledOnce()
    expect(onLCP).toHaveBeenCalledOnce()
    expect(onFCP).toHaveBeenCalledOnce()
    expect(onTTFB).toHaveBeenCalledOnce()
  })

  test('passes a callback function to each observer', () => {
    measureWebVitals()
    expect(onCLS).toHaveBeenCalledWith(expect.any(Function))
    expect(onINP).toHaveBeenCalledWith(expect.any(Function))
    expect(onLCP).toHaveBeenCalledWith(expect.any(Function))
    expect(onFCP).toHaveBeenCalledWith(expect.any(Function))
    expect(onTTFB).toHaveBeenCalledWith(expect.any(Function))
  })

  describe('sendToAnalytics callback', () => {
    // En mode test, import.meta.env.DEV = true → console.log est appelé (pas sendBeacon)
    test('calls console.log for each metric in test/dev mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      measureWebVitals()
      const callback = onCLS.mock.calls[0][0]
      callback({ name: 'CLS', value: 0.1, rating: 'good', delta: 0.1, id: 'v1', navigationType: 'navigate' })
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Web Vitals]'),
        expect.anything(),
        expect.stringMatching(/\(good\)/)
      )
      consoleSpy.mockRestore()
    })

    test('logs all metric names with their values', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      measureWebVitals()
      const metrics = [
        { fn: onCLS,  name: 'CLS',  value: 0.1  },
        { fn: onINP,  name: 'INP',  value: 200  },
        { fn: onLCP,  name: 'LCP',  value: 2500 },
        { fn: onFCP,  name: 'FCP',  value: 1200 },
        { fn: onTTFB, name: 'TTFB', value: 300  },
      ]
      metrics.forEach(({ fn, name, value }) => {
        const cb = fn.mock.calls[0][0]
        cb({ name, value, rating: 'good', delta: value, id: 'id1', navigationType: 'navigate' })
      })
      expect(consoleSpy).toHaveBeenCalledTimes(5)
      consoleSpy.mockRestore()
    })

    test('includes metric value in log output', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      measureWebVitals()
      const callback = onLCP.mock.calls[0][0]
      callback({ name: 'LCP', value: 2800, rating: 'needs-improvement', delta: 2800, id: 'v2', navigationType: 'navigate' })
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LCP'),
        2800,
        expect.any(String)
      )
      consoleSpy.mockRestore()
    })

    test('warns when a metric exceeds performance budget', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      measureWebVitals()
      const callback = onINP.mock.calls[0][0]
      callback({
        name: 'INP',
        value: 350,
        rating: 'poor',
        delta: 350,
        id: 'inp-over-budget',
        navigationType: 'navigate',
      })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Web Vitals Budget] INP'))
      logSpy.mockRestore()
      warnSpy.mockRestore()
    })
  })
})

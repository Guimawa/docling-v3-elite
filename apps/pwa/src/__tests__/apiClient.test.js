import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { API_BASE_URL } from '@/shared/config/api'
import apiClient from '@/shared/lib/apiClient'

let mock

beforeEach(() => {
  mock = new MockAdapter(apiClient)
})

afterEach(() => {
  mock.restore()
})

describe('apiClient configuration', () => {
  test('has correct baseURL', () => {
    expect(apiClient.defaults.baseURL).toBe(API_BASE_URL)
  })

  test('has 120 second timeout', () => {
    expect(apiClient.defaults.timeout).toBe(120_000)
  })

  test('is an axios instance', () => {
    expect(typeof apiClient.get).toBe('function')
    expect(typeof apiClient.post).toBe('function')
    expect(typeof apiClient.delete).toBe('function')
  })

  test('sends credentials (httpOnly cookie)', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })
})

describe('apiClient request interceptor — CSRF header', () => {
  test('adds X-Requested-With header on every request', async () => {
    let capturedHeaders = null

    mock.onGet('/api/v1/auth/me').reply((config) => {
      capturedHeaders = config.headers
      return [200, { user: 'test' }]
    })

    await apiClient.get('/api/v1/auth/me')
    expect(capturedHeaders?.['X-Requested-With']).toBe('XMLHttpRequest')
  })

  test('does NOT add Authorization header (auth via httpOnly cookie only)', async () => {
    localStorage.setItem('docling-token', 'should-not-be-used')
    let capturedHeaders = null

    mock.onGet('/api/v1/auth/me').reply((config) => {
      capturedHeaders = config.headers
      return [200, { user: 'test' }]
    })

    await apiClient.get('/api/v1/auth/me')
    expect(capturedHeaders?.Authorization).toBeUndefined()
    localStorage.removeItem('docling-token')
  })
})

describe('apiClient response interceptor — 401 redirect', () => {
  test('rejects with error on 401 response', async () => {
    mock.onGet('/api/v1/auth/me').reply(401, { detail: 'Token invalide' })

    await expect(apiClient.get('/api/v1/auth/me')).rejects.toThrow()
  })

  test('passes through 200 responses unchanged', async () => {
    mock.onGet('/health').reply(200, { status: 'ok', db: 'connected', version: '3.0.0' })

    const resp = await apiClient.get('/health')
    expect(resp.data.status).toBe('ok')
    expect(resp.data.db).toBe('connected')
  })
})

describe('apiClient — CSRF double-submit', () => {
  test('adds X-CSRF-Token header on POST when csrf_token cookie present', async () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'csrf_token=abc123',
    })
    let capturedHeaders = null
    mock.onPost('/api/v1/test').reply((config) => {
      capturedHeaders = config.headers
      return [200, {}]
    })
    await apiClient.post('/api/v1/test', {})
    expect(capturedHeaders?.['X-CSRF-Token']).toBe('abc123')
    Object.defineProperty(document, 'cookie', { writable: true, configurable: true, value: '' })
  })

  test('adds X-CSRF-Token on DELETE', async () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      configurable: true,
      value: 'csrf_token=del456',
    })
    let capturedHeaders = null
    mock.onDelete('/api/v1/test/1').reply((config) => {
      capturedHeaders = config.headers
      return [200, {}]
    })
    await apiClient.delete('/api/v1/test/1')
    expect(capturedHeaders?.['X-CSRF-Token']).toBe('del456')
    Object.defineProperty(document, 'cookie', { writable: true, configurable: true, value: '' })
  })
})

describe('apiClient — 401 on auth pages skips refresh', () => {
  test('rejects immediately on /login without attempting refresh', async () => {
    delete window.location
    window.location = { pathname: '/login', href: 'http://localhost/login' }

    mock.onGet('/api/v1/products').reply(401)
    const refreshSpy = vi.spyOn(apiClient, 'post')

    await expect(apiClient.get('/api/v1/products')).rejects.toBeDefined()
    // refresh ne doit pas être appelé
    expect(refreshSpy).not.toHaveBeenCalledWith(expect.stringContaining('refresh'))

    refreshSpy.mockRestore()
  })
})

describe('apiClient — refresh token auto-retry', () => {
  test('retries original request after successful token refresh', async () => {
    delete window.location
    window.location = { pathname: '/catalogue', href: 'http://localhost/catalogue' }

    let callCount = 0
    mock.onGet('/api/v1/catalogue').reply(() => {
      callCount++
      return callCount === 1 ? [401, {}] : [200, { items: ['ciment'] }]
    })
    mock.onPost('/api/v1/auth/refresh').reply(200, {})

    const res = await apiClient.get('/api/v1/catalogue')
    expect(res.data.items).toEqual(['ciment'])
    expect(callCount).toBe(2)
  })
})

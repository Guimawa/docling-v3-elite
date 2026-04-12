import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// ── Fake IndexedDB ────────────────────────────────────────────────────────────
function makeFakeIDB({ triggerUpgrade = false } = {}) {
  const items = []
  let nextId = 1

  function makeReq(getResult) {
    const req = { error: null }
    queueMicrotask(() => {
      req.result = getResult()
      req.onsuccess?.()
    })
    return req
  }

  const store = {
    add(item) {
      const id = nextId++
      items.push({ ...item, id })
      return makeReq(() => id)
    },
    getAll() { return makeReq(() => [...items]) },
    count()   { return makeReq(() => items.length) },
    delete(id) {
      const idx = items.findIndex((i) => i.id === id)
      if (idx > -1) items.splice(idx, 1)
    },
  }

  const db = {
    objectStoreNames: { contains: () => !triggerUpgrade },
    createObjectStore: vi.fn(() => ({})),
    transaction() {
      const tx = { objectStore: () => store, error: null }
      queueMicrotask(() => tx.oncomplete?.())
      return tx
    },
  }

  global.indexedDB = {
    open() {
      const req = { result: db, error: null }
      queueMicrotask(() => {
        if (triggerUpgrade) req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }

  return { items, db }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('offlineQueue', () => {
  let fakeDB

  beforeEach(() => {
    fakeDB = makeFakeIDB()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('getPendingCount returns 0 on empty queue', async () => {
    const { getPendingCount } = await import('../offlineQueue')
    const count = await getPendingCount()
    expect(count).toBe(0)
  })

  test('getPendingUploads returns empty array on empty queue', async () => {
    const { getPendingUploads } = await import('../offlineQueue')
    const uploads = await getPendingUploads()
    expect(uploads).toEqual([])
  })

  test('enqueueUpload adds a file and dispatches event', async () => {
    const { enqueueUpload } = await import('../offlineQueue')
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const fakeFile = new File(['hello'], 'test.jpg', { type: 'image/jpeg' })
    const id = await enqueueUpload(fakeFile, 'gemini-flash', 'camera')

    expect(typeof id).toBe('number')
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'docling-offline-queue-updated' })
    )
  })

  test('removePendingUpload deletes item and dispatches event', async () => {
    const { removePendingUpload } = await import('../offlineQueue')
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    await removePendingUpload(1)

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'docling-offline-queue-updated' })
    )
  })

  test('processQueue with empty queue returns zeros', async () => {
    const { processQueue } = await import('../offlineQueue')
    const uploadFn = vi.fn()
    const result = await processQueue(uploadFn)
    expect(result).toEqual({ success: 0, failed: 0, total: 0 })
    expect(uploadFn).not.toHaveBeenCalled()
  })

  test('processQueue counts failed items when uploadFn throws', async () => {
    const { enqueueUpload, processQueue } = await import('../offlineQueue')

    const fakeFile = new File(['data'], 'facture.pdf', { type: 'application/pdf' })
    await enqueueUpload(fakeFile, 'gemini-flash', 'import')

    const uploadFn = vi.fn().mockRejectedValue(new Error('upload failed'))
    const result = await processQueue(uploadFn)

    expect(result.failed).toBe(1)
    expect(result.success).toBe(0)
    expect(result.total).toBe(1)
  })

  test('openDB triggers onupgradeneeded on first DB creation', async () => {
    fakeDB = makeFakeIDB({ triggerUpgrade: true })
    const { getPendingCount } = await import('../offlineQueue')
    const count = await getPendingCount()
    expect(count).toBe(0)
    // createObjectStore doit avoir été appelé (store non existant)
    expect(fakeDB.db.createObjectStore).toHaveBeenCalledWith(
      'pending-uploads',
      expect.objectContaining({ keyPath: 'id', autoIncrement: true })
    )
  })
})

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { compressToWebP } from '../imageService'

// ── Canvas & Image mocks ──────────────────────────────────────────────────────
const mockCtx = { drawImage: vi.fn() }
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => mockCtx),
  toBlob: vi.fn(),
}

class MockImage {
  constructor() {
    this.width  = 800
    this.height = 600
    this.onload  = null
    this.onerror = null
  }

  set src(_url) {
    // Simule le chargement asynchrone
    queueMicrotask(() => this.onload?.())
  }
}

beforeEach(() => {
  vi.clearAllMocks()

  // Remplace les APIs navigateur
  globalThis.Image = MockImage
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url-123')
  globalThis.URL.revokeObjectURL = vi.fn()

  // Mock document.createElement pour retourner notre canvas
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') return mockCanvas
    return document.createElementNS('http://www.w3.org/1999/xhtml', tag)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const makeFile = (name = 'photo.jpg', type = 'image/jpeg') =>
  new File(['fake-image-data'], name, { type })

describe('compressToWebP', () => {
  test('resolves with a WebP File on success', async () => {
    mockCanvas.toBlob.mockImplementation((cb) => {
      cb(new Blob(['webp-data'], { type: 'image/webp' }))
    })

    const file = makeFile()
    const result = await compressToWebP(file)

    expect(result).toBeInstanceOf(File)
    expect(result.type).toBe('image/webp')
    expect(result.name).toBe('photo.webp')
  })

  test('creates an object URL from the input file', async () => {
    mockCanvas.toBlob.mockImplementation((cb) =>
      cb(new Blob([''], { type: 'image/webp' }))
    )
    await compressToWebP(makeFile())
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })

  test('revokes object URL after processing', async () => {
    mockCanvas.toBlob.mockImplementation((cb) =>
      cb(new Blob([''], { type: 'image/webp' }))
    )
    await compressToWebP(makeFile())
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url-123')
  })

  test('uses provided quality parameter', async () => {
    let capturedQuality = null
    mockCanvas.toBlob.mockImplementation((cb, _type, quality) => {
      capturedQuality = quality
      cb(new Blob([''], { type: 'image/webp' }))
    })
    await compressToWebP(makeFile(), 0.7)
    expect(capturedQuality).toBe(0.7)
  })

  test('calls drawImage on the canvas context', async () => {
    mockCanvas.toBlob.mockImplementation((cb) =>
      cb(new Blob([''], { type: 'image/webp' }))
    )
    await compressToWebP(makeFile())
    expect(mockCtx.drawImage).toHaveBeenCalledOnce()
  })

  test('scales down image when width exceeds MAX_SIZE (2000)', async () => {
    class BigImage extends MockImage {
      constructor() {
        super()
        this.width  = 4000
        this.height = 3000
      }
    }
    globalThis.Image = BigImage

    mockCanvas.toBlob.mockImplementation((cb) =>
      cb(new Blob([''], { type: 'image/webp' }))
    )
    await compressToWebP(makeFile())

    // Le canvas doit être réduit à max 2000px
    expect(mockCanvas.width).toBeLessThanOrEqual(2000)
    expect(mockCanvas.height).toBeLessThanOrEqual(2000)
  })

  test('keeps original dimensions when within MAX_SIZE', async () => {
    mockCanvas.width  = 0
    mockCanvas.height = 0
    mockCanvas.toBlob.mockImplementation((cb) =>
      cb(new Blob([''], { type: 'image/webp' }))
    )
    await compressToWebP(makeFile())
    // 800x600 → reste à 800x600
    expect(mockCanvas.width).toBe(800)
    expect(mockCanvas.height).toBe(600)
  })

  test('rejects when toBlob returns null (canvas not supported)', async () => {
    mockCanvas.toBlob.mockImplementation((cb) => cb(null))

    await expect(compressToWebP(makeFile())).rejects.toThrow('Compression failed')
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  test('rejects when image fails to load', async () => {
    class BrokenImage extends MockImage {
      set src(_url) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    globalThis.Image = BrokenImage

    await expect(compressToWebP(makeFile('broken.jpg'))).rejects.toThrow('Cannot read broken.jpg')
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  test('renames file extension to .webp', async () => {
    mockCanvas.toBlob.mockImplementation((cb) =>
      cb(new Blob([''], { type: 'image/webp' }))
    )
    const result = await compressToWebP(makeFile('document.pdf'))
    expect(result.name).toBe('document.webp')
  })

  test('uses webp MIME type for toBlob', async () => {
    let capturedType = null
    mockCanvas.toBlob.mockImplementation((cb, type) => {
      capturedType = type
      cb(new Blob([''], { type: 'image/webp' }))
    })
    await compressToWebP(makeFile())
    expect(capturedType).toBe('image/webp')
  })
})

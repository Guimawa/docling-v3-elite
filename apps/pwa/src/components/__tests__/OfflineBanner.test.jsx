import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/shared/lib/offlineQueue', () => ({
  getPendingCount: vi.fn(),
  processQueue:    vi.fn(),
}))

vi.mock('@/shared/lib/apiClient', () => ({
  default: { post: vi.fn() },
}))

vi.mock('@/shared/config/api', () => ({
  ENDPOINTS: { process: '/api/v1/invoices/process' },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('lucide-react', () => ({
  AlertCircle: () => <svg data-testid="icon-alert" aria-hidden />,
  PackagePlus:  () => <svg data-testid="icon-package" aria-hidden />,
  RefreshCw:    ({ className }) => <svg data-testid="icon-refresh" className={className} aria-hidden />,
}))

import { getPendingCount, processQueue } from '@/shared/lib/offlineQueue'
import { toast } from 'sonner'
import OfflineBanner from '../OfflineBanner'

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    getPendingCount.mockResolvedValue(0)
  })

  test('renders nothing when online and 0 pending', async () => {
    const { container } = render(<OfflineBanner />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  test('renders banner when offline with pending files', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    getPendingCount.mockResolvedValue(3)
    render(<OfflineBanner />)
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  test('shows "Hors ligne" and count when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    getPendingCount.mockResolvedValue(2)
    render(<OfflineBanner />)
    await waitFor(() => {
      expect(screen.getByText(/hors ligne/i)).toBeInTheDocument()
      expect(screen.getByText(/2 fichier/i)).toBeInTheDocument()
    })
  })

  test('shows alert icon when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    getPendingCount.mockResolvedValue(1)
    render(<OfflineBanner />)
    await waitFor(() => {
      expect(screen.getByTestId('icon-alert')).toBeInTheDocument()
    })
  })

  test('shows retry button when online with pending files', async () => {
    getPendingCount.mockResolvedValue(1)
    render(<OfflineBanner />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument()
    })
  })

  test('banner has role=status and aria-live=polite', async () => {
    getPendingCount.mockResolvedValue(1)
    render(<OfflineBanner />)
    await waitFor(() => {
      const banner = screen.getByRole('status')
      expect(banner).toHaveAttribute('aria-live', 'polite')
    })
  })

  test('clicking retry calls processQueue', async () => {
    getPendingCount.mockResolvedValue(2)
    processQueue.mockResolvedValue({ success: 2, failed: 0, total: 2 })
    render(<OfflineBanner />)
    await waitFor(() => screen.getByRole('button', { name: /réessayer/i }))
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    await waitFor(() => {
      expect(processQueue).toHaveBeenCalledOnce()
    })
  })

  test('shows success toast after successful retry', async () => {
    getPendingCount.mockResolvedValue(1)
    processQueue.mockResolvedValue({ success: 1, failed: 0, total: 1 })
    render(<OfflineBanner />)
    await waitFor(() => screen.getByRole('button', { name: /réessayer/i }))
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('1 upload'))
    })
  })

  test('shows error toast when some uploads fail', async () => {
    getPendingCount.mockResolvedValue(2)
    processQueue.mockResolvedValue({ success: 1, failed: 1, total: 2 })
    render(<OfflineBanner />)
    await waitFor(() => screen.getByRole('button', { name: /réessayer/i }))
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('1 upload'))
    })
  })

  test('updates banner on docling-offline-queue-updated event', async () => {
    getPendingCount.mockResolvedValueOnce(0).mockResolvedValueOnce(3)
    render(<OfflineBanner />)
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    fireEvent(window, new Event('docling-offline-queue-updated'))
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  test('cleans up event listeners on unmount', () => {
    getPendingCount.mockResolvedValue(0)
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<OfflineBanner />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('online',  expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('docling-offline-queue-updated', expect.any(Function))
    removeSpy.mockRestore()
  })

  test('going online triggers refresh', async () => {
    getPendingCount.mockResolvedValue(0)
    render(<OfflineBanner />)
    fireEvent(window, new Event('online'))
    await waitFor(() => {
      expect(getPendingCount).toHaveBeenCalled()
    })
  })

  test('going offline sets offline state', async () => {
    getPendingCount.mockResolvedValue(1)
    render(<OfflineBanner />)
    await waitFor(() => screen.getByRole('status'))
    fireEvent(window, new Event('offline'))
    await waitFor(() => {
      expect(screen.getByText(/hors ligne/i)).toBeInTheDocument()
    })
  })

  test('processQueue receives uploadFn that posts to apiClient', async () => {
    const apiClient = (await import('@/shared/lib/apiClient')).default
    apiClient.post.mockResolvedValue({ data: { job_id: '123' } })

    getPendingCount.mockResolvedValue(1)
    processQueue.mockImplementation(async (uploadFn) => {
      // Actually call uploadFn to cover that code path
      await uploadFn(new File([''], 'test.jpg', { type: 'image/jpeg' }), 'gemini-pro', 'pc')
      return { success: 1, failed: 0 }
    })

    render(<OfflineBanner />)
    await waitFor(() => screen.getByRole('button', { name: /réessayer/i }))
    fireEvent.click(screen.getByRole('button', { name: /réessayer/i }))
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled()
    })
  })
})

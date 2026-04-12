import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const assignMock = vi.fn()

vi.mock('@/shared/lib/apiClient', () => ({
  default: { post: vi.fn() },
}))

import LoginPage from '../LoginPage'

describe('LoginPage — Google', () => {
  beforeEach(() => {
    assignMock.mockClear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: assignMock },
      writable: true,
    })
  })

  test('bouton Google déclenche location.assign vers google/start', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const btn = screen.getByRole('button', { name: /Continuer avec Google/i })
    expect(btn).toBeInTheDocument()

    await user.click(btn)
    expect(assignMock).toHaveBeenCalledTimes(1)
    expect(String(assignMock.mock.calls[0][0])).toContain('/api/v1/auth/google/start')
  })
})

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { GoogleLoginButton } from './google-login-button'

// Mock del hook de toast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}))

describe('GoogleLoginButton', () => {
  const originalLocation = window.location
  let locationMock: { href: string }

  beforeEach(() => {
    mockToast.mockReset()
    
    // Mock de window.location para testear la redirección
    locationMock = { href: '' }
    delete (window as any).location
    window.location = locationMock as any

    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com')
  })

  afterEach(() => {
    window.location = originalLocation
  })

  function renderWithRouter(element: React.ReactElement) {
    return render(<MemoryRouter>{element}</MemoryRouter>)
  }

  it('renders the button with accessible label', () => {
    renderWithRouter(<GoogleLoginButton />)
    expect(
      screen.getByRole('button', { name: /continuar con google/i })
    ).toBeInTheDocument()
  })

  it('redirects to Google OAuth URL on click', async () => {
    const user = userEvent.setup()
    renderWithRouter(<GoogleLoginButton />)

    await user.click(screen.getByRole('button', { name: /continuar con google/i }))

    expect(locationMock.href).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(locationMock.href).toContain('client_id=test-client-id.apps.googleusercontent.com')
    expect(locationMock.href).toContain('response_type=id_token')
    expect(locationMock.href).toContain('scope=openid%20email%20profile')
    expect(locationMock.href).toContain('redirect_uri=')
    expect(locationMock.href).toContain('nonce=')
  })

  it('shows error toast if VITE_GOOGLE_CLIENT_ID is missing', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    const user = userEvent.setup()
    
    renderWithRouter(<GoogleLoginButton />)
    await user.click(screen.getByRole('button', { name: /continuar con google/i }))

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Google no disponible',
        description: expect.stringMatching(/no está configurado/i),
        variant: 'destructive',
      })
    )
    expect(locationMock.href).toBe('')
  })

  it('disables the button when the disabled prop is true', () => {
    renderWithRouter(<GoogleLoginButton disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

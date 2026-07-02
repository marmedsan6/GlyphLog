import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { GoogleLoginButton } from './google-login-button'
import * as authService from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth.store'
import { clearAccessToken } from '@/lib/auth-token'

// Mock del hook de toast para poder verificar los mensajes sin necesidad de
// renderizar el <Toaster /> real (que vive en App.tsx).
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}))

// Mocks centralizados — el componente depende de tres sistemas:
// 1. El SDK de Google (window.google.accounts.id)
// 2. El servicio auth.service (loginWithGoogle)
// 3. El store de auth (useAuthStore)
const mockPrompt = vi.fn()
const mockInitialize = vi.fn()
const mockCancel = vi.fn()

beforeEach(() => {
  mockToast.mockReset()
  mockPrompt.mockReset()
  mockInitialize.mockReset()
  mockCancel.mockReset()
  clearAccessToken()
  useAuthStore.setState({ isAuthenticated: false })

  // Mock del SDK de Google Identity Services.
  // Lo definimos como una propiedad configurable de window para que cada test
  // pueda ajustar el comportamiento de initialize/prompt sin recrear el objeto.
  Object.defineProperty(window, 'google', {
    configurable: true,
    value: {
      accounts: {
        id: {
          initialize: mockInitialize,
          prompt: mockPrompt,
          cancel: mockCancel,
        },
      },
    },
  })

  // Mock del servicio: devuelve un user y token válidos por defecto.
  vi.spyOn(authService, 'loginWithGoogle').mockResolvedValue({
    user: {
      id: 'user-id',
      email: 'user@example.com',
    },
    access_token: 'fake-jwt',
    token_type: 'bearer',
  })

  // Mock de import.meta.env.VITE_GOOGLE_CLIENT_ID
  // vitest expone import.meta.env a través de vi.stubEnv
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com')
})

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('GoogleLoginButton', () => {
  it('renders the button with accessible label', () => {
    renderWithRouter(<GoogleLoginButton />)
    expect(
      screen.getByRole('button', { name: /continuar con google/i })
    ).toBeInTheDocument()
  })

  it('initializes Google Identity Services on mount', async () => {
    renderWithRouter(<GoogleLoginButton />)
    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledTimes(1)
    })
    // Debe inicializarse con el clientId correcto, callback y FedCM habilitado
    const config = mockInitialize.mock.calls[0][0]
    expect(config.client_id).toBe('test-client-id.apps.googleusercontent.com')
    expect(typeof config.callback).toBe('function')
    // use_fedcm_for_button no se usa en botones custom con prompt()
    expect(config.use_fedcm_for_button).toBeUndefined()
  })

  it('opens the Google popup when clicked', async () => {
    const user = userEvent.setup()
    renderWithRouter(<GoogleLoginButton />)

    // Esperar a que se inicialice GIS antes de hacer click
    await waitFor(() => expect(mockInitialize).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /continuar con google/i }))

    expect(mockPrompt).toHaveBeenCalledTimes(1)
    // prompt() recibe un callback de notificación para detectar supresiones;
    // verificamos que se llama con una función (no sin argumentos).
    expect(typeof mockPrompt.mock.calls[0][0]).toBe('function')
  })

  it('calls loginWithGoogle when Google returns a valid id_token', async () => {
    renderWithRouter(<GoogleLoginButton />)

    await waitFor(() => expect(mockInitialize).toHaveBeenCalled())

    // Capturamos el callback que GIS invoca con el id_token
    const initConfig = mockInitialize.mock.calls[0][0]
    const callback = initConfig.callback as (response: { credential?: string }) => void

    // Simulamos la respuesta de Google dentro de act() para evitar warnings
    // de React sobre actualizaciones de estado fuera del wrapper de testing.
    await act(async () => {
      callback({ credential: 'fake-google-id-token' })
    })

    await waitFor(() => {
      expect(authService.loginWithGoogle).toHaveBeenCalledWith('fake-google-id-token')
    })
  })

  it('authenticates the user after a successful Google response', async () => {
    renderWithRouter(<GoogleLoginButton />)

    await waitFor(() => expect(mockInitialize).toHaveBeenCalled())

    const initConfig = mockInitialize.mock.calls[0][0]
    const callback = initConfig.callback as (response: { credential?: string }) => void

    await act(async () => {
      callback({ credential: 'fake-google-id-token' })
    })

    await waitFor(() => {
      // El store de Zustand actualiza isAuthenticated tras login
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('shows an error toast when the backend rejects the id_token', async () => {
    vi.spyOn(authService, 'loginWithGoogle').mockRejectedValue({
      isAxiosError: true,
      response: { data: { detail: 'Token de Google inválido o expirado' } },
    })

    renderWithRouter(<GoogleLoginButton />)
    await waitFor(() => expect(mockInitialize).toHaveBeenCalled())

    const initConfig = mockInitialize.mock.calls[0][0]
    const callback = initConfig.callback as (response: { credential?: string }) => void

    await act(async () => {
      callback({ credential: 'bad-token' })
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/token de google inválido/i),
          variant: 'destructive',
        })
      )
    })
    // El usuario NO debe quedar autenticado si el backend rechaza
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('shows an error toast when Google returns no credential', async () => {
    renderWithRouter(<GoogleLoginButton />)
    await waitFor(() => expect(mockInitialize).toHaveBeenCalled())

    const initConfig = mockInitialize.mock.calls[0][0]
    const callback = initConfig.callback as (response: { credential?: string }) => void
    // Google responde sin credential (caso raro pero posible)
    await act(async () => {
      callback({})
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringMatching(/no se recibió un token válido/i),
          variant: 'destructive',
        })
      )
    })
    expect(authService.loginWithGoogle).not.toHaveBeenCalled()
  })

  it('cancels the Google popup on unmount to prevent orphan prompts', async () => {
    // Ver issue #17 (cleanup): si el componente se desmonta mientras el
    // popup de Google está abierto, debe llamar a google.accounts.id.cancel()
    // para evitar un popup huérfano (zombie auth).
    const { unmount } = renderWithRouter(<GoogleLoginButton />)
    await waitFor(() => expect(mockInitialize).toHaveBeenCalled())

    expect(mockCancel).not.toHaveBeenCalled()

    unmount()

    await waitFor(() => {
      expect(mockCancel).toHaveBeenCalledTimes(1)
    })
  })

  it('disables the button when the disabled prop is true', () => {
    renderWithRouter(<GoogleLoginButton disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

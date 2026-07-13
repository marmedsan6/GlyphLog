import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockQueryClientClear = vi.fn()
const mockClearAccessToken = vi.fn()
const mockGetAccessToken = vi.fn(() => null)

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    clear: mockQueryClientClear,
  },
}))

vi.mock('@/lib/auth-token', () => ({
  getAccessToken: mockGetAccessToken,
  setAccessToken: vi.fn(),
  clearAccessToken: mockClearAccessToken,
}))

vi.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://localhost:8000/api/v1',
    apiBaseUrl: 'http://localhost:8000',
    googleClientId: '',
  },
}))

const mockRequestUse = vi.fn()
const mockResponseUse = vi.fn()
const mockAxiosInstance = {
  interceptors: {
    request: { use: mockRequestUse },
    response: { use: mockResponseUse },
  },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}))

describe('apiClient 401 response interceptor', () => {
  let responseErrorHandler: (error: unknown) => Promise<unknown>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubGlobal('location', { href: '' })

    // Reimportamos el módulo en cada test para que el flag de módulo
    // `isRedirectingToLogin` vuelva a su valor inicial `false`.
    await import('@/lib/api-client')

    const [, errorHandler] = mockResponseUse.mock.calls[0]
    responseErrorHandler = errorHandler as (error: unknown) => Promise<unknown>
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clears session when receiving 401 from a protected endpoint', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/api/v1/entries' },
    }

    await expect(responseErrorHandler(error)).rejects.toEqual(error)

    expect(mockClearAccessToken).toHaveBeenCalledTimes(1)
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1)
  })

  it('redirects to login with sessionExpired flag on 401', async () => {
    const error = {
      response: { status: 401 },
      config: { url: '/api/v1/entries' },
    }

    await expect(responseErrorHandler(error)).rejects.toEqual(error)

    expect(window.location.href).toBe('/login?sessionExpired=1')
  })

  it('does not redirect more than once for concurrent 401 errors', async () => {
    const firstError = {
      response: { status: 401 },
      config: { url: '/api/v1/entries' },
    }
    const secondError = {
      response: { status: 401 },
      config: { url: '/api/v1/entries/1' },
    }

    await expect(responseErrorHandler(firstError)).rejects.toEqual(firstError)
    await expect(responseErrorHandler(secondError)).rejects.toEqual(secondError)

    // La sesión solo se limpia una vez, a pesar de los dos 401.
    expect(mockClearAccessToken).toHaveBeenCalledTimes(1)
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1)
    // La redirección también ocurre una sola vez.
    expect(window.location.href).toBe('/login?sessionExpired=1')
  })

  it('does not clear session for 401 on auth endpoints', async () => {
    const loginError = {
      response: { status: 401 },
      config: { url: '/api/v1/auth/login' },
    }

    await expect(responseErrorHandler(loginError)).rejects.toEqual(loginError)

    expect(mockClearAccessToken).not.toHaveBeenCalled()
    expect(mockQueryClientClear).not.toHaveBeenCalled()
  })
})

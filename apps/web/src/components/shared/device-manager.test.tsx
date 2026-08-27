import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { DeviceManager } from './device-manager'
import { createTestQueryClient } from '@/test/create-test-query-client'
import { pingCompanion, clearCompanionToken, getCompanionStoreUrl } from '@/utils/companion-extension'

vi.mock('@/utils/companion-extension', async () => {
  const actual = await vi.importActual<typeof import('@/utils/companion-extension')>(
    '@/utils/companion-extension'
  )
  return {
    ...actual,
    pingCompanion: vi.fn(),
    clearCompanionToken: vi.fn(),
    getCompanionStoreUrl: vi.fn(),
  }
})

vi.mock('@/hooks/use-devices', () => ({
  useDevices: () => ({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGeneratePairingCode: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRevokeDevice: () => ({
    mutateAsync: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const mockPing = vi.mocked(pingCompanion)
const mockClear = vi.mocked(clearCompanionToken)
const mockStoreUrl = vi.mocked(getCompanionStoreUrl)

function renderManager() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DeviceManager />
    </QueryClientProvider>
  )
}

describe('DeviceManager', () => {
  beforeEach(() => {
    mockPing.mockReset()
    mockClear.mockReset()
    mockStoreUrl.mockReset()
    mockStoreUrl.mockReturnValue('')
    mockPing.mockResolvedValue(null)
  })

  it('muestra la guía y declara Firefox y Safari no soportados', async () => {
    renderManager()
    expect(await screen.findByText('Guía de Companion')).toBeInTheDocument()
    expect(screen.getAllByText(/Firefox y Safari no están soportados/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Chrome o Brave/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Nunca copies el JWT/i)).toBeInTheDocument()
    expect(screen.getByText(/No ve el resto de tu navegación/i)).toBeInTheDocument()
  })

  it('usa el zip como CTA cuando no hay URL de Store', async () => {
    renderManager()
    expect(await screen.findByRole('link', { name: /descargar extensión/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /añadir a chrome/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Cargar descomprimida/i)).toBeInTheDocument()
  })

  it('muestra Añadir a Chrome cuando hay URL de Store', async () => {
    mockStoreUrl.mockReturnValue('https://chromewebstore.google.com/detail/glyphlog')
    renderManager()
    const storeLink = await screen.findByRole('link', { name: /añadir a chrome/i })
    expect(storeLink).toHaveAttribute('href', 'https://chromewebstore.google.com/detail/glyphlog')
    expect(screen.getByRole('link', { name: /descargar extensión/i })).toBeInTheDocument()
  })

  it('trata un ping nulo como no instalada', async () => {
    renderManager()
    expect(
      await screen.findByText(/No está instalada en este navegador/i)
    ).toBeInTheDocument()
  })

  it('ofrece emparejar cuando está instalada y no emparejada', async () => {
    mockPing.mockResolvedValue({ version: '0.2.0', paired: false })
    renderManager()
    expect(await screen.findByText(/Instalada. Emparéjala/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Emparejar$/i }).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Cargar descomprimida/i)).not.toBeInTheDocument()
  })

  it('no trata como no instalada si está emparejada aunque la lista esté vacía', async () => {
    mockPing.mockResolvedValue({ version: '0.2.0', paired: true })
    renderManager()
    expect(await screen.findByText(/Instalada y emparejada/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Companion está emparejada en este navegador/i)
    ).toBeInTheDocument()
  })

  it('nunca pide copiar el token de sesión', async () => {
    renderManager()
    await screen.findByText('Guía de Companion')
    expect(screen.queryByText(/copia tu JWT/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/token de sesión/i).length).toBeGreaterThan(0)
  })
})

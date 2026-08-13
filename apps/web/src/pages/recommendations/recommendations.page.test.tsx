import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { RecommendationsPage } from './recommendations.page'
import { useGenerateRecommendations } from '@/hooks/useGenerateRecommendations'
import { useToast } from '@/hooks/use-toast'
import { createTestQueryClient } from '@/test/create-test-query-client'
import type { GenerateRecommendationsResponse } from '@/services/recommendation.service'

vi.mock('@/hooks/useGenerateRecommendations')
vi.mock('@/hooks/use-toast')
vi.mock('@/hooks/useCreateEntry', () => ({
  useCreateEntry: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

const mockUseGenerateRecommendations = vi.mocked(useGenerateRecommendations)
const mockToast = vi.fn()
const mockNavigate = vi.fn()

vi.mocked(useToast).mockReturnValue({
  toast: mockToast,
  dismiss: vi.fn(),
  toasts: [],
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function makeResponse(
  overrides: Partial<GenerateRecommendationsResponse> = {}
): GenerateRecommendationsResponse {
  return {
    recommendations: [
      {
        title: 'Attack on Titan',
        type: 'anime',
        match_percentage: 95,
        reason: 'Basado en tu amor por Fullmetal Alchemist',
        genres: ['Action', 'Dark Fantasy'],
        year: 2013,
        external_url: 'https://anilist.co/anime/16498',
        cover_image_url: 'https://example.com/cover.jpg',
        similar_to: ['Fullmetal Alchemist', 'Death Note'],
      },
    ],
    metadata: {
      analyzed_entries: 15,
      favorite_genres: ['Action', 'Fantasy', 'Sci-Fi'],
      avg_rating: 8.5,
      completion_rate: 75.0,
      tokens_used: 45000,
      model: 'anthropic.claude-haiku-4-5-20251001-v1:0',
    },
    ...overrides,
  }
}

function renderWithProviders(element: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </MemoryRouter>
  )
}

describe('RecommendationsPage', () => {
  beforeEach(() => {
    mockUseGenerateRecommendations.mockReset()
    mockToast.mockReset()
    mockNavigate.mockReset()
  })

  it('renderiza empty state inicial', () => {
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    expect(screen.getByText('Recomendaciones personalizadas')).toBeInTheDocument()
    expect(screen.getByText('Genera tu primera recomendación personalizada')).toBeInTheDocument()
    expect(
      screen.getByText(/Configura los filtros arriba y haz clic en "Generar recomendaciones"/)
    ).toBeInTheDocument()
  })

  it('filtros de tipo cambian estado', async () => {
    const mockMutate = vi.fn()
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const typeButton = screen.getByRole('button', { name: /Todos/ })
    await userEvent.click(typeButton)

    const animeOption = screen.getByRole('menuitem', { name: 'Anime' })
    await userEvent.click(animeOption)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Anime/ })).toBeInTheDocument()
    })
  })

  it('filtro de límite cambia estado', async () => {
    const mockMutate = vi.fn()
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const limitButton = screen.getByRole('button', { name: /10 recomendaciones/ })
    await userEvent.click(limitButton)

    const fiveOption = screen.getByRole('menuitem', { name: '5 recomendaciones' })
    await userEvent.click(fiveOption)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /5 recomendaciones/ })).toBeInTheDocument()
    })
  })

  it('click "Generar" llama mutate con filtros', async () => {
    const mockMutate = vi.fn()
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const generateButton = screen.getByRole('button', { name: /Generar recomendaciones/ })
    await userEvent.click(generateButton)

    expect(mockMutate).toHaveBeenCalledWith(
      { type: undefined, limit: 10 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
  })

  it('loading state correcto', () => {
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    expect(
      screen.getByRole('button', { name: /Claude está analizando tu colección.../ })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Claude está analizando tu colección.../ })).toBeDisabled()
  })

  it('success state renderiza grid + metadata', async () => {
    const mockMutate = vi.fn((_, callbacks) => {
      callbacks.onSuccess?.(makeResponse())
    })
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const generateButton = screen.getByRole('button', { name: /Generar recomendaciones/ })
    await userEvent.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('Attack on Titan')).toBeInTheDocument()
    })

    expect(screen.getByText('Análisis de tu colección')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('success con 0 resultados muestra mensaje', async () => {
    const mockMutate = vi.fn((_, callbacks) => {
      callbacks.onSuccess?.(makeResponse({ recommendations: [] }))
    })
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const generateButton = screen.getByRole('button', { name: /Generar recomendaciones/ })
    await userEvent.click(generateButton)

    await waitFor(() => {
      expect(
        screen.getByText('No se encontraron recomendaciones con los filtros seleccionados.')
      ).toBeInTheDocument()
    })
  })

  it('error "menos de 5 entradas" toast específico', async () => {
    const axiosError = new AxiosError('Bad Request')
    axiosError.response = {
      data: { detail: 'Necesitas tener al menos de 5 entradas en tu colección' },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} as import('axios').AxiosRequestHeaders },
    }

    const mockMutate = vi.fn((_, callbacks) => {
      callbacks.onError?.(axiosError)
    })
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const generateButton = screen.getByRole('button', { name: /Generar recomendaciones/ })
    await userEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Colección insuficiente',
        description:
          'Añade al menos 5 entradas a tu colección para obtener recomendaciones personalizadas.',
        variant: 'destructive',
      })
    })
  })

  it('error genérico muestra toast', async () => {
    const axiosError = new AxiosError('Network error')
    axiosError.response = {
      data: { detail: 'Network error' },
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config: { headers: {} as import('axios').AxiosRequestHeaders },
    }

    const mockMutate = vi.fn((_, callbacks) => {
      callbacks.onError?.(axiosError)
    })
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const generateButton = screen.getByRole('button', { name: /Generar recomendaciones/ })
    await userEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error al generar recomendaciones',
        description: 'Network error',
        variant: 'destructive',
      })
    })
  })

  it('alert disclaimer visible', () => {
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    expect(
      screen.getByText(/Este sistema usa Claude Haiku 4.5 en AWS Bedrock/)
    ).toBeInTheDocument()
  })

  it('botón "Volver" navega a /collection', async () => {
    mockUseGenerateRecommendations.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useGenerateRecommendations>)

    renderWithProviders(<RecommendationsPage />)

    const backButton = screen.getByRole('button', { name: /Volver a la colección/ })
    await userEvent.click(backButton)

    expect(mockNavigate).toHaveBeenCalledWith('/collection')
  })
})

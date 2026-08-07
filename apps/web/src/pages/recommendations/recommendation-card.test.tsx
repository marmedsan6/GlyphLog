import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecommendationCard } from './recommendation-card'
import { useCreateEntry } from '@/hooks/useCreateEntry'
import { useToast } from '@/hooks/use-toast'
import type { Recommendation } from '@/services/recommendation.service'

vi.mock('@/hooks/useCreateEntry')
vi.mock('@/hooks/use-toast')

const mockCreateEntry = vi.mocked(useCreateEntry)
const mockToast = vi.fn()

vi.mocked(useToast).mockReturnValue({
  toast: mockToast,
  dismiss: vi.fn(),
  toasts: [],
})

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    title: 'Attack on Titan',
    type: 'anime',
    match_percentage: 95,
    reason: 'Basado en tu amor por Fullmetal Alchemist',
    genres: ['Action', 'Dark Fantasy'],
    year: 2013,
    external_url: 'https://anilist.co/anime/16498',
    cover_image_url: 'https://example.com/cover.jpg',
    similar_to: ['Fullmetal Alchemist', 'Death Note'],
    ...overrides,
  }
}

describe('RecommendationCard', () => {
  it('renderiza card con todos los datos completos', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation()
    render(<RecommendationCard recommendation={recommendation} />)

    expect(screen.getByText('Attack on Titan')).toBeInTheDocument()
    expect(screen.getByText('Anime')).toBeInTheDocument()
    expect(screen.getByText('95% match')).toBeInTheDocument()
    expect(screen.getByText('Basado en tu amor por Fullmetal Alchemist')).toBeInTheDocument()
    expect(screen.getByText('2013')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Dark Fantasy')).toBeInTheDocument()
    expect(screen.getByText(/Similar a:/)).toBeInTheDocument()
    expect(screen.getByText(/Fullmetal Alchemist, Death Note/)).toBeInTheDocument()
  })

  it('renderiza sin cover image (muestra placeholder)', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation({ cover_image_url: null })
    render(<RecommendationCard recommendation={recommendation} />)

    expect(screen.getByText('Sin imagen')).toBeInTheDocument()
    expect(screen.queryByAltText('Portada de Attack on Titan')).not.toBeInTheDocument()
  })

  it('match badge ≥80% variant "default" (verde)', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation({ match_percentage: 85 })
    render(<RecommendationCard recommendation={recommendation} />)

    const badge = screen.getByText('85% match')
    expect(badge).toBeInTheDocument()
  })

  it('match badge ≥65% variant "secondary" (amarillo)', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation({ match_percentage: 70 })
    render(<RecommendationCard recommendation={recommendation} />)

    const badge = screen.getByText('70% match')
    expect(badge).toBeInTheDocument()
  })

  it('match badge <65% variant "destructive" (rojo)', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation({ match_percentage: 50 })
    render(<RecommendationCard recommendation={recommendation} />)

    const badge = screen.getByText('50% match')
    expect(badge).toBeInTheDocument()
  })

  it('click "Añadir a Plan to Watch" llama createEntry', async () => {
    const mockMutate = vi.fn()
    mockCreateEntry.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation()
    render(<RecommendationCard recommendation={recommendation} />)

    const button = screen.getByRole('button', { name: /Añadir a Plan to Watch/ })
    await userEvent.click(button)

    expect(mockMutate).toHaveBeenCalledWith(
      {
        title: 'Attack on Titan',
        type: 'anime',
        status: 'plan_to_watch',
        year: 2013,
        cover_image: 'https://example.com/cover.jpg',
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    )
  })

  it('muestra toast de éxito al añadir', async () => {
    const mockMutate = vi.fn((_, callbacks) => {
      callbacks.onSuccess?.()
    })
    mockCreateEntry.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation()
    render(<RecommendationCard recommendation={recommendation} />)

    const button = screen.getByRole('button', { name: /Añadir a Plan to Watch/ })
    await userEvent.click(button)

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Añadido a Plan to Watch',
      description: '"Attack on Titan" se ha añadido a tu colección.',
    })
  })

  it('muestra toast de error si falla', async () => {
    const mockMutate = vi.fn((_, callbacks) => {
      callbacks.onError?.(new Error('Error de red'))
    })
    mockCreateEntry.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation()
    render(<RecommendationCard recommendation={recommendation} />)

    const button = screen.getByRole('button', { name: /Añadir a Plan to Watch/ })
    await userEvent.click(button)

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error al añadir',
      description: 'Error de red',
      variant: 'destructive',
    })
  })

  it('link externo solo si existe external_url', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const { rerender } = render(<RecommendationCard recommendation={makeRecommendation()} />)

    const linkWithUrl = screen.getByRole('link', { name: /Ver en sitio externo/ })
    expect(linkWithUrl).toHaveAttribute('href', 'https://anilist.co/anime/16498')

    rerender(<RecommendationCard recommendation={makeRecommendation({ external_url: null })} />)

    expect(screen.queryByRole('link', { name: /Ver en sitio externo/ })).not.toBeInTheDocument()
  })

  it('géneros como badges', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const recommendation = makeRecommendation({ genres: ['Action', 'Fantasy', 'Drama'] })
    render(<RecommendationCard recommendation={recommendation} />)

    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('"Similar a" solo si hay items', () => {
    mockCreateEntry.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateEntry>)

    const { rerender } = render(<RecommendationCard recommendation={makeRecommendation()} />)

    expect(screen.getByText(/Similar a:/)).toBeInTheDocument()

    rerender(<RecommendationCard recommendation={makeRecommendation({ similar_to: [] })} />)

    expect(screen.queryByText(/Similar a:/)).not.toBeInTheDocument()
  })
})

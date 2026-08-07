import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecommendationMetadataPanel } from './recommendation-metadata'
import type { RecommendationMetadata } from '@/services/recommendation.service'

function makeMetadata(overrides: Partial<RecommendationMetadata> = {}): RecommendationMetadata {
  return {
    analyzed_entries: 15,
    favorite_genres: ['Action', 'Fantasy', 'Sci-Fi'],
    avg_rating: 8.5,
    completion_rate: 75.0,
    tokens_used: 45000,
    model: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
    ...overrides,
  }
}

describe('RecommendationMetadataPanel', () => {
  it('renderiza todas las stats', () => {
    const metadata = makeMetadata()
    render(<RecommendationMetadataPanel metadata={metadata} />)

    expect(screen.getByText('Análisis de tu colección')).toBeInTheDocument()
    expect(screen.getByText('Entradas analizadas')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Rating promedio')).toBeInTheDocument()
    expect(screen.getByText('Tasa de completado')).toBeInTheDocument()
    expect(screen.getByText('Géneros favoritos')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
  })

  it('formatea avg_rating con 1 decimal', () => {
    const metadata = makeMetadata({ avg_rating: 8.567 })
    render(<RecommendationMetadataPanel metadata={metadata} />)

    expect(screen.getByText('8.6')).toBeInTheDocument()
  })

  it('formatea completion_rate con 0 decimales', () => {
    const metadata = makeMetadata({ completion_rate: 75.789 })
    render(<RecommendationMetadataPanel metadata={metadata} />)

    expect(screen.getByText('76%')).toBeInTheDocument()
  })

  it('renderiza géneros favoritos como badges', () => {
    const metadata = makeMetadata({ favorite_genres: ['Action', 'Drama'] })
    render(<RecommendationMetadataPanel metadata={metadata} />)

    expect(screen.getByText('Géneros favoritos')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('muestra modelo y tokens si tokens_used no es null', () => {
    const metadata = makeMetadata({
      tokens_used: 45000,
      model: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
    })
    render(<RecommendationMetadataPanel metadata={metadata} />)

    expect(screen.getByText(/Modelo:/)).toBeInTheDocument()
    expect(screen.getByText(/anthropic.claude-sonnet-4-5-20250929-v1:0/)).toBeInTheDocument()
    expect(screen.getByText(/Tokens:/)).toBeInTheDocument()
    // toLocaleString() puede usar diferentes separadores dependiendo del locale
    expect(screen.getByText(/45[,.]000/)).toBeInTheDocument()
  })

  it('no muestra tokens si tokens_used es null', () => {
    const metadata = makeMetadata({ tokens_used: null })
    render(<RecommendationMetadataPanel metadata={metadata} />)

    expect(screen.getByText(/Modelo:/)).toBeInTheDocument()
    expect(screen.queryByText(/Tokens:/)).not.toBeInTheDocument()
  })
})

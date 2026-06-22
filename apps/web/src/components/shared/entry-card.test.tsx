import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EntryCard } from './entry-card'
import type { EntryListItem } from '@/types'

vi.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://localhost:8000/api/v1',
    apiBaseUrl: 'http://localhost:8000',
  },
}))

function makeEntry(overrides: Partial<EntryListItem> = {}): EntryListItem {
  return {
    id: 'entry-1',
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: 9.5,
    cover_image: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('EntryCard', () => {
  it('renders title, type, status and rating', () => {
    renderWithRouter(<EntryCard entry={makeEntry()} />)

    expect(screen.getByText('One Piece')).toBeInTheDocument()
    expect(screen.getByText('Anime')).toBeInTheDocument()
    expect(screen.getByText('Viendo')).toBeInTheDocument()
    expect(screen.getByText(/9\.5/)).toBeInTheDocument()
  })

  it('renders placeholder when cover image is missing', () => {
    renderWithRouter(<EntryCard entry={makeEntry({ cover_image: null })} />)

    expect(screen.getByText('Sin imagen')).toBeInTheDocument()
  })

  it('renders cover image using the public backend URL', () => {
    renderWithRouter(
      <EntryCard
        entry={makeEntry({
          cover_image: '/uploads/covers/image.jpg',
        })}
      />
    )

    const image = screen.getByAltText('Portada de One Piece')
    expect(image).toHaveAttribute(
      'src',
      'http://localhost:8000/uploads/covers/image.jpg'
    )
  })

  it('does not render rating when it is null', () => {
    renderWithRouter(<EntryCard entry={makeEntry({ rating: null })} />)

    expect(screen.queryByText(/Puntuación/)).not.toBeInTheDocument()
  })

  it('uses type-specific status labels', () => {
    renderWithRouter(
      <EntryCard
        entry={makeEntry({
          type: 'game',
          status: 'watching',
        })}
      />
    )

    expect(screen.getByText('Jugando')).toBeInTheDocument()
    expect(screen.getByText('Videojuego')).toBeInTheDocument()
  })

  it('links to the entry detail page', () => {
    renderWithRouter(<EntryCard entry={makeEntry()} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/entries/entry-1')
  })
})

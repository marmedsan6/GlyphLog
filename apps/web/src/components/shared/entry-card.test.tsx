import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EntryCard } from './entry-card'
import type { EntryListItem } from '@/types'
import { useQuickProgress } from '@/hooks/useQuickProgress'

vi.mock('@/hooks/useQuickProgress', () => ({
  useQuickProgress: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

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
    expect(image).toHaveAttribute('src', 'http://localhost:8000/uploads/covers/image.jpg')
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

  it('renders quick progress button when progress is configured', () => {
    const entry = makeEntry({
      progress_unit: 'episodes',
      progress_total: 12,
      current_progress: 3,
    })
    renderWithRouter(<EntryCard entry={entry} />)

    expect(screen.getByText('3/12 ep.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Incrementar progreso/ })).toBeInTheDocument()
    expect(screen.getByText('+1 ep.')).toBeInTheDocument()
  })

  it('does not render quick progress button when status is completed', () => {
    const entry = makeEntry({
      progress_unit: 'episodes',
      progress_total: 12,
      current_progress: 12,
      status: 'completed',
    })
    renderWithRouter(<EntryCard entry={entry} />)

    expect(screen.queryByRole('button', { name: /Incrementar progreso/ })).not.toBeInTheDocument()
  })

  it('prevents event propagation when clicking the increment button', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(useQuickProgress).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useQuickProgress>)

    const entry = makeEntry({
      progress_unit: 'episodes',
      progress_total: 12,
      current_progress: 3,
    })

    // Envolver en un link con mock onClick para comprobar la propagación
    const handleParentClick = vi.fn()
    render(
      <MemoryRouter>
        <div onClick={handleParentClick}>
          <EntryCard entry={entry} />
        </div>
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: /Incrementar progreso/ })
    
    // Simular clic
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    await user.click(button)

    expect(mockMutate).toHaveBeenCalled()
    expect(handleParentClick).not.toHaveBeenCalled()
  })

  it('renders inline progress editor when progress_unit is configured', () => {
    const entry = makeEntry({
      progress_unit: 'episodes',
      progress_total: 24,
      current_progress: 12,
    })
    renderWithRouter(<EntryCard entry={entry} />)

    expect(screen.getByText('12 / 24')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /editar progreso/i })).toBeInTheDocument()
  })

  it('does not render inline progress editor when progress_unit is null', () => {
    const entry = makeEntry({
      progress_unit: null,
      progress_total: null,
      current_progress: null,
    })
    renderWithRouter(<EntryCard entry={entry} />)

    expect(screen.queryByRole('button', { name: /editar progreso/i })).not.toBeInTheDocument()
  })
})

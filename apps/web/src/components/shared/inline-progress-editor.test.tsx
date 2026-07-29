import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { InlineProgressEditor } from './inline-progress-editor'
import { useQuickProgress } from '@/hooks/useQuickProgress'
import type { EntryListItem } from '@/types'

vi.mock('@/hooks/useQuickProgress', () => ({
  useQuickProgress: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
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
    rating: null,
    cover_image: null,
    created_at: '2024-01-01T00:00:00Z',
    progress_unit: 'episodes',
    progress_total: 24,
    current_progress: 12,
    ...overrides,
  }
}

function renderWithRouter(element: React.ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('InlineProgressEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders progress text in read mode', () => {
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    expect(screen.getByText('12 / 24')).toBeInTheDocument()
  })

  it('renders progress without total when progress_total is null', () => {
    renderWithRouter(<InlineProgressEditor entry={makeEntry({ progress_total: null })} />)

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.queryByText('/')).not.toBeInTheDocument()
  })

  it('switches to edit mode on click', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(12)
  })

  it('confirms on Enter and calls API', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(useQuickProgress).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useQuickProgress>)

    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '15')
    await user.keyboard('{Enter}')

    expect(mockMutate).toHaveBeenCalledWith({
      entryId: 'entry-1',
      newValue: 15,
      mark_completed: false,
    })
  })

  it('cancels on Escape without calling API', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(useQuickProgress).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useQuickProgress>)

    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '15')
    await user.keyboard('{Escape}')

    expect(mockMutate).not.toHaveBeenCalled()
    expect(screen.getByText('12 / 24')).toBeInTheDocument()
  })

  it('shows validation error for negative values', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '-5')
    await user.keyboard('{Enter}')

    expect(screen.getByText('El valor no puede ser negativo')).toBeInTheDocument()
  })

  it('shows validation error for values exceeding total', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '30')
    await user.keyboard('{Enter}')

    expect(screen.getByText('El valor no puede superar 24')).toBeInTheDocument()
  })

  it('shows validation error for decimals in anime (episodes)', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '12.5')
    await user.keyboard('{Enter}')

    expect(screen.getByText('Solo se permiten números enteros para este tipo')).toBeInTheDocument()
  })

  it('allows decimals for games (hours)', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(useQuickProgress).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useQuickProgress>)

    const user = userEvent.setup()
    renderWithRouter(
      <InlineProgressEditor
        entry={makeEntry({
          type: 'game',
          progress_unit: 'hours',
          current_progress: 10,
          progress_total: 40,
        })}
      />
    )

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '12.5')
    await user.keyboard('{Enter}')

    expect(mockMutate).toHaveBeenCalledWith({
      entryId: 'entry-1',
      newValue: 12.5,
      mark_completed: false,
    })
  })

  it('shows validation error for more than 2 decimals in hours', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <InlineProgressEditor
        entry={makeEntry({
          type: 'game',
          progress_unit: 'hours',
          current_progress: 10,
          progress_total: 40,
        })}
      />
    )

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '12.555')
    await user.keyboard('{Enter}')

    expect(screen.getByText('Máximo 2 decimales')).toBeInTheDocument()
  })

  it('shows spinner during pending state', () => {
    vi.mocked(useQuickProgress).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useQuickProgress>)

    renderWithRouter(<InlineProgressEditor entry={makeEntry()} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    expect(button).toBeDisabled()
  })

  it('prevents event propagation on button click', async () => {
    const handleParentClick = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <div onClick={handleParentClick}>
          <InlineProgressEditor entry={makeEntry()} />
        </div>
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    expect(handleParentClick).not.toHaveBeenCalled()
  })

  it('opens completion dialog when reaching total', async () => {
    const mockMutate = vi.fn().mockResolvedValue({})
    vi.mocked(useQuickProgress).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useQuickProgress>)

    const user = userEvent.setup()
    renderWithRouter(<InlineProgressEditor entry={makeEntry({ current_progress: 23 })} />)

    const button = screen.getByRole('button', { name: /editar progreso/i })
    await user.click(button)

    const input = screen.getByRole('spinbutton', { name: /editar progreso/i })
    await user.clear(input)
    await user.type(input, '24')
    await user.keyboard('{Enter}')

    expect(screen.getByText('¿Completar entrada?')).toBeInTheDocument()
  })
})

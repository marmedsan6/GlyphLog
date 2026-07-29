import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProgressTimeline } from './progress-timeline'
import { useProgressHistory } from '@/hooks/useProgressHistory'
import type { ProgressHistoryEvent } from '@/services/entry.service'

vi.mock('@/hooks/useProgressHistory', () => ({
  useProgressHistory: vi.fn(),
}))

function makeMockEvent(overrides: Partial<ProgressHistoryEvent> = {}): ProgressHistoryEvent {
  return {
    id: 'evt-1',
    entry_id: 'entry-1',
    previous_value: 2,
    current_value: 5,
    delta: 3,
    unit: 'episodes',
    recorded_at: '2026-07-18T10:00:00Z',
    note: 'Maratón matutino',
    source: 'web',
    event_type: 'update',
    user_id: 'usr-1',
    ...overrides,
  }
}

describe('ProgressTimeline', () => {
  it('returns null when hasHistory is false', () => {
    vi.mocked(useProgressHistory).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgressHistory>)

    const { container } = render(<ProgressTimeline entryId="entry-1" hasHistory={false} />)
    expect(container.firstChild).toBeNull()
  })


  it('renders skeleton when loading', () => {
    vi.mocked(useProgressHistory).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgressHistory>)

    render(<ProgressTimeline entryId="entry-1" hasHistory={true} />)

    expect(screen.getByTestId('timeline-skeleton')).toBeInTheDocument()
  })

  it('renders error message and retry button when isError is true', async () => {
    const mockRefetch = vi.fn()
    vi.mocked(useProgressHistory).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Error de conexión'),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useProgressHistory>)

    render(<ProgressTimeline entryId="entry-1" hasHistory={true} />)

    expect(screen.getByText('Error de conexión')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /Reintentar/i })
    await userEvent.click(retryBtn)
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('renders empty message when events array is empty', () => {
    vi.mocked(useProgressHistory).mockReturnValue({
      data: { pages: [{ events: [], next_cursor: null, has_more: false }] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgressHistory>)

    render(<ProgressTimeline entryId="entry-1" hasHistory={true} />)

    expect(screen.getByText('Sin historial de progreso registrado.')).toBeInTheDocument()
  })

  it('renders list of events with descriptions, deltas and notes', () => {
    const events = [
      makeMockEvent({
        id: 'evt-1',
        previous_value: 2,
        current_value: 5,
        delta: 3,
        note: 'Viendo con amigos',
      }),
      makeMockEvent({
        id: 'evt-2',
        previous_value: 5,
        current_value: 0,
        delta: -5,
        event_type: 'reset',
        note: 'Reinicio de prueba',
      }),
    ]

    vi.mocked(useProgressHistory).mockReturnValue({
      data: { pages: [{ events, next_cursor: null, has_more: false }] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgressHistory>)

    render(<ProgressTimeline entryId="entry-1" hasHistory={true} />)

    expect(screen.getByText('Historial de progreso')).toBeInTheDocument()
    expect(screen.getByText('episodios 2 → 5')).toBeInTheDocument()
    expect(screen.getByText('(+3)')).toBeInTheDocument()
    expect(screen.getByText('"Viendo con amigos"')).toBeInTheDocument()

    expect(screen.getByText('Seguimiento reiniciado (episodios 5 → 0)')).toBeInTheDocument()
    expect(screen.getByText('(Reinicio)')).toBeInTheDocument()
    expect(screen.getByText('"Reinicio de prueba"')).toBeInTheDocument()
  })

  it('renders load more button when hasNextPage is true', async () => {
    const mockFetchNextPage = vi.fn()
    vi.mocked(useProgressHistory).mockReturnValue({
      data: { pages: [{ events: [makeMockEvent()], next_cursor: 'cursor-1', has_more: true }] },
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProgressHistory>)

    render(<ProgressTimeline entryId="entry-1" hasHistory={true} />)

    const loadMoreBtn = screen.getByRole('button', { name: /Cargar más eventos/i })
    expect(loadMoreBtn).toBeInTheDocument()

    await userEvent.click(loadMoreBtn)
    expect(mockFetchNextPage).toHaveBeenCalled()
  })
})

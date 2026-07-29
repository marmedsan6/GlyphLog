import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useEntries } from './useEntries'
import { getEntries } from '@/services/entry.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { EntryListItem, PaginatedEntryResponse } from '@/types'

vi.mock('@/services/entry.service')

const mockGetEntries = vi.mocked(getEntries)

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

function makePaginatedResponse(
  entries: EntryListItem[],
  overrides: Partial<PaginatedEntryResponse> = {}
): PaginatedEntryResponse {
  const total = entries.length
  return {
    entries,
    total,
    page: 1,
    limit: 15,
    total_pages: Math.ceil(total / 15) || 0,
    ...overrides,
  }
}

describe('useEntries', () => {
  beforeEach(() => {
    mockGetEntries.mockReset()
  })

  it('returns loading state initially', () => {
    mockGetEntries.mockResolvedValue(makePaginatedResponse([]))

    const { result } = renderHook(() => useEntries(), {
      wrapper: TestQueryProvider,
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.entries).toEqual([])
  })

  it('returns entries and pagination metadata on success', async () => {
    const entry = makeEntry()
    mockGetEntries.mockResolvedValue(makePaginatedResponse([entry], { total_pages: 1 }))

    const { result } = renderHook(() => useEntries(), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.entries).toEqual([entry])
    expect(result.current.total).toBe(1)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.isError).toBe(false)
  })

  it('passes type filter to the service and resets page to 1', async () => {
    mockGetEntries.mockResolvedValue(makePaginatedResponse([]))

    const { result } = renderHook(() => useEntries(), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setPage(3)
    })
    act(() => {
      result.current.setType('game')
    })

    await waitFor(() => {
      expect(mockGetEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: 'game', page: 1, limit: 15 })
      )
    })
  })

  it('exposes error state when the service fails', async () => {
    mockGetEntries.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useEntries(), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.entries).toEqual([])
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEntry } from './useEntry'
import { getEntry } from '@/services/entry.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { EntryResponse } from '@/types'

vi.mock('@/services/entry.service')

const mockGetEntry = vi.mocked(getEntry)

function makeEntry(overrides: Partial<EntryResponse> = {}): EntryResponse {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: 9.5,
    year: 1999,
    notes: 'Un clásico',
    cover_image: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ...overrides,
  }
}

describe('useEntry', () => {
  beforeEach(() => {
    mockGetEntry.mockReset()
  })

  it('returns loading state initially', () => {
    mockGetEntry.mockResolvedValue(makeEntry())

    const { result } = renderHook(() => useEntry('entry-1'), {
      wrapper: TestQueryProvider,
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('returns entry data on success', async () => {
    const entry = makeEntry()
    mockGetEntry.mockResolvedValue(entry)

    const { result } = renderHook(() => useEntry('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(entry)
    expect(result.current.isError).toBe(false)
    expect(mockGetEntry).toHaveBeenCalledWith('entry-1')
  })

  it('exposes error state when the service fails', async () => {
    mockGetEntry.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useEntry('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeUndefined()
  })

  it('does not fetch when id is empty', () => {
    mockGetEntry.mockResolvedValue(makeEntry())

    renderHook(() => useEntry(''), {
      wrapper: TestQueryProvider,
    })

    expect(mockGetEntry).not.toHaveBeenCalled()
  })
})

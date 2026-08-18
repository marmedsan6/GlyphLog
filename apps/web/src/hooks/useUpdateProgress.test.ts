import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useUpdateProgress } from './useUpdateProgress'
import { updateProgress } from '@/services/entry.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { EntryResponse } from '@/types'

vi.mock('@/services/entry.service')

const mockUpdateProgress = vi.mocked(updateProgress)

function makeEntry(overrides: Partial<EntryResponse> = {}): EntryResponse {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: 9.5,
    year: 1999,
    notes: 'Notas',
    cover_image: null,
    genres: null,
    progress_unit: 'episodes',
    progress_total: 12,
    current_progress: 2,
    has_history: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ...overrides,
  }
}

describe('useUpdateProgress', () => {
  beforeEach(() => {
    mockUpdateProgress.mockReset()
  })

  it('calls updateProgress service with id and data', async () => {
    const updatedEntry = makeEntry({ current_progress: 5 })
    mockUpdateProgress.mockResolvedValue(updatedEntry)

    const { result } = renderHook(() => useUpdateProgress('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync({
        new_value: 5,
        note: 'Viendo capítulos',
        mark_completed: false,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdateProgress).toHaveBeenCalledWith('entry-1', {
      new_value: 5,
      note: 'Viendo capítulos',
      mark_completed: false,
    })
    expect(result.current.data).toEqual(updatedEntry)
  })

  it('resolves successfully after invalidating queries', async () => {
    mockUpdateProgress.mockResolvedValue(makeEntry())

    const { result } = renderHook(() => useUpdateProgress('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync({
        new_value: 5,
        mark_completed: false,
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('exposes error state when the service fails', async () => {
    mockUpdateProgress.mockRejectedValue(new Error('Update progress failed'))

    const { result } = renderHook(() => useUpdateProgress('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          new_value: 5,
          mark_completed: false,
        })
      } catch {
        // Expected error
      }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

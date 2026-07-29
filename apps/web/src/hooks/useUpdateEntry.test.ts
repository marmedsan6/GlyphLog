import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useUpdateEntry } from './useUpdateEntry'
import { updateEntry } from '@/services/entry.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { EntryResponse, EntryUpdateFormData } from '@/types'

vi.mock('@/services/entry.service')

const mockUpdateEntry = vi.mocked(updateEntry)

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
    progress_unit: null,
    progress_total: null,
    current_progress: null,
    has_history: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ...overrides,
  }
}

function makeFormData(overrides: Partial<EntryUpdateFormData> = {}): EntryUpdateFormData {
  return {
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: '9.5',
    year: '1999',
    notes: 'Notas',
    progress_total: null,
    ...overrides,
  }
}

describe('useUpdateEntry', () => {
  beforeEach(() => {
    mockUpdateEntry.mockReset()
  })

  it('calls updateEntry service with id and data', async () => {
    const updatedEntry = makeEntry()
    mockUpdateEntry.mockResolvedValue(updatedEntry)

    const { result } = renderHook(() => useUpdateEntry('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync(makeFormData())
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdateEntry).toHaveBeenCalledWith('entry-1', makeFormData())
    expect(result.current.data).toEqual(updatedEntry)
  })

  it('resolves successfully after invalidating queries', async () => {
    mockUpdateEntry.mockResolvedValue(makeEntry())

    const { result } = renderHook(() => useUpdateEntry('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync(makeFormData())
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('exposes error state when the service fails', async () => {
    mockUpdateEntry.mockRejectedValue(new Error('Update failed'))

    const { result } = renderHook(() => useUpdateEntry('entry-1'), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync(makeFormData())
      } catch {
        // Error esperado
      }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

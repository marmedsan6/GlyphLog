import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useQuickProgress } from './useQuickProgress'
import { updateProgress } from '@/services/entry.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import { useQueryClient } from '@tanstack/react-query'
import type { EntryResponse, PaginatedEntryResponse } from '@/types'
import { ENTRIES_QUERY_KEY } from './useEntries'

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

describe('useQuickProgress', () => {
  beforeEach(() => {
    mockUpdateProgress.mockReset()
  })

  it('debería llamar a updateProgress con los parámetros correctos', async () => {
    const updatedEntry = makeEntry({ current_progress: 3 })
    mockUpdateProgress.mockResolvedValue(updatedEntry)

    const { result } = renderHook(() => useQuickProgress(), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync({
        entryId: 'entry-1',
        newValue: 3,
        mark_completed: false,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdateProgress).toHaveBeenCalledWith('entry-1', {
      new_value: 3,
      mark_completed: false,
    })
  })

  it('debería aplicar optimistic update y actualizar la caché de react-query', async () => {
    const originalEntry = makeEntry({ current_progress: 2 })
    const updatedEntry = makeEntry({ current_progress: 3 })
    mockUpdateProgress.mockResolvedValue(updatedEntry)

    // Necesitamos acceder al queryClient para precargar la caché
    let queryClientInstance: ReturnType<typeof useQueryClient> | undefined

    const TestComponentGrabber = ({ grabber }: { grabber: (qc: ReturnType<typeof useQueryClient>) => void }) => {
      const qc = useQueryClient()
      grabber(qc)
      return null
    }

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <TestQueryProvider>
          <TestComponentGrabber grabber={(qc) => (queryClientInstance = qc)} />
          {children}
        </TestQueryProvider>
      )
    }

    const { result } = renderHook(() => useQuickProgress(), {
      wrapper: TestWrapper,
    })

    // Precargar listado y detalle
    act(() => {
      queryClientInstance?.setQueryData<PaginatedEntryResponse>([ENTRIES_QUERY_KEY, { page: 1 }], {
        entries: [originalEntry],
        total: 1,
        page: 1,
        limit: 15,
        total_pages: 1,
      })
      queryClientInstance?.setQueryData<EntryResponse>(['entry', 'entry-1'], originalEntry)
    })

    // Ejecutar mutación
    let mutationPromise: Promise<unknown> | undefined
    act(() => {
      mutationPromise = result.current.mutateAsync({
        entryId: 'entry-1',
        newValue: 3,
        mark_completed: false,
      })
    })

    // Verificar optimistic update en caché esperando que se resuelvan los awaits de onMutate
    await waitFor(() => {
      const optimisticList = queryClientInstance?.getQueryData<PaginatedEntryResponse>([ENTRIES_QUERY_KEY, { page: 1 }])
      const optimisticDetail = queryClientInstance?.getQueryData<EntryResponse>(['entry', 'entry-1'])
      expect(optimisticList?.entries[0].current_progress).toBe(3)
      expect(optimisticDetail?.current_progress).toBe(3)
    })

    // Esperar que la mutación termine
    await act(async () => {
      await mutationPromise
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('debería revertir a la caché previa (rollback) si el servicio falla', async () => {
    const originalEntry = makeEntry({ current_progress: 2 })
    mockUpdateProgress.mockRejectedValue(new Error('Network error'))

    let queryClientInstance: ReturnType<typeof useQueryClient> | undefined

    const TestComponentGrabber = ({ grabber }: { grabber: (qc: ReturnType<typeof useQueryClient>) => void }) => {
      const qc = useQueryClient()
      grabber(qc)
      return null
    }

    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      return (
        <TestQueryProvider>
          <TestComponentGrabber grabber={(qc) => (queryClientInstance = qc)} />
          {children}
        </TestQueryProvider>
      )
    }

    const { result } = renderHook(() => useQuickProgress(), {
      wrapper: TestWrapper,
    })

    // Precargar caché
    act(() => {
      queryClientInstance?.setQueryData<PaginatedEntryResponse>([ENTRIES_QUERY_KEY, { page: 1 }], {
        entries: [originalEntry],
        total: 1,
        page: 1,
        limit: 15,
        total_pages: 1,
      })
      queryClientInstance?.setQueryData<EntryResponse>(['entry', 'entry-1'], originalEntry)
    })

    // Ejecutar mutación y manejar el error
    await act(async () => {
      try {
        await result.current.mutateAsync({
          entryId: 'entry-1',
          newValue: 3,
          mark_completed: false,
        })
      } catch {
        // Ignorar error esperado
      }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    // Verificar que la caché volvió al valor original (2)
    const listData = queryClientInstance?.getQueryData<PaginatedEntryResponse>([ENTRIES_QUERY_KEY, { page: 1 }])
    const detailData = queryClientInstance?.getQueryData<EntryResponse>(['entry', 'entry-1'])

    expect(listData?.entries[0].current_progress).toBe(2)
    expect(detailData?.current_progress).toBe(2)
  })
})

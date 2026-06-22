import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDeleteEntry } from './useDeleteEntry'
import { deleteEntry } from '@/services/entry.service'
import { TestQueryProvider } from '@/test/query-client-provider'

vi.mock('@/services/entry.service')

const mockDeleteEntry = vi.mocked(deleteEntry)

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('useDeleteEntry', () => {
  beforeEach(() => {
    mockDeleteEntry.mockReset()
    mockNavigate.mockReset()
  })

  it('calls deleteEntry service with id', async () => {
    mockDeleteEntry.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteEntry(), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync('entry-1')
    })

    expect(mockDeleteEntry.mock.calls[0][0]).toBe('entry-1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('navigates to /collection on success', async () => {
    mockDeleteEntry.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteEntry(), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync('entry-1')
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/collection')
    })
  })

  it('exposes error state when the service fails', async () => {
    mockDeleteEntry.mockRejectedValue(new Error('Delete failed'))

    const { result } = renderHook(() => useDeleteEntry(), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      try {
        await result.current.mutateAsync('entry-1')
      } catch {
        // Error esperado
      }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

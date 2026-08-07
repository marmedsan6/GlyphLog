import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useConversation, useConversations, useDeleteConversation } from './useConversations'
import { deleteConversation, getConversation, getConversations } from '@/services/ai.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { PaginatedConversationsResponse } from '@/services/ai.service'

vi.mock('@/services/ai.service')

const mockGetConversations = vi.mocked(getConversations)
const mockGetConversation = vi.mocked(getConversation)
const mockDeleteConversation = vi.mocked(deleteConversation)

function makeList(): PaginatedConversationsResponse {
  return {
    conversations: [
      {
        id: 'conv-1',
        title: 'Recomendaciones de anime',
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-06T10:00:00Z',
      },
      {
        id: 'conv-2',
        title: 'Mi colección de manga',
        created_at: '2026-08-02T10:00:00Z',
        updated_at: '2026-08-05T10:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 15,
    total_pages: 1,
  }
}

function makeDetail() {
  return {
    id: 'conv-1',
    title: 'Recomendaciones de anime',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-06T10:00:00Z',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: '¿Qué anime me recomiendas?',
        created_at: '2026-08-06T10:00:00Z',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Te recomiendo Frieren',
        created_at: '2026-08-06T10:00:01Z',
      },
    ],
  }
}

describe('useConversations', () => {
  beforeEach(() => {
    mockGetConversations.mockReset()
    mockGetConversation.mockReset()
    mockDeleteConversation.mockReset()
  })

  it('carga el listado de conversaciones', async () => {
    mockGetConversations.mockResolvedValue(makeList())

    const { result } = renderHook(() => useConversations(), { wrapper: TestQueryProvider })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.total).toBe(2)
    expect(result.current.data?.conversations[0].title).toBe('Recomendaciones de anime')
  })

  it('useConversation queda deshabilitada sin id', () => {
    const { result } = renderHook(() => useConversation(null), { wrapper: TestQueryProvider })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockGetConversation).not.toHaveBeenCalled()
  })

  it('useConversation carga el detalle con mensajes cuando hay id', async () => {
    mockGetConversation.mockResolvedValue(makeDetail() as never)

    const { result } = renderHook(() => useConversation('conv-1'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.messages).toHaveLength(2)
    expect(result.current.data?.messages[1].content).toBe('Te recomiendo Frieren')
  })

  it('useDeleteConversation invalida el listado tras borrar', async () => {
    mockGetConversations.mockResolvedValue(makeList())
    mockDeleteConversation.mockResolvedValue(undefined)

    const { result } = renderHook(
      () => ({
        conversations: useConversations(),
        deleteMutation: useDeleteConversation(),
      }),
      { wrapper: TestQueryProvider },
    )

    await waitFor(() => expect(result.current.conversations.isSuccess).toBe(true))

    await act(async () => {
      await result.current.deleteMutation.mutateAsync('conv-1')
    })

    expect(mockDeleteConversation).toHaveBeenCalledWith('conv-1')
    // La invalidación dispara una nueva carga del listado activo.
    await waitFor(() => expect(mockGetConversations.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(result.current.conversations.isSuccess).toBe(true)
  })
})

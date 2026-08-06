import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAIChat } from './useAIChat'
import { streamChat, type AIStreamEvent } from '@/services/ai.service'

vi.mock('@/services/ai.service', () => ({
  streamChat: vi.fn(),
}))

const mockStreamChat = vi.mocked(streamChat)

describe('useAIChat', () => {
  beforeEach(() => {
    mockStreamChat.mockReset()
  })

  it('envía el mensaje y acumula los deltas en la burbuja del asistente', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'conversation_id', conversationId: 'conv-1' }
      yield { type: 'delta', delta: 'Hola, ' }
      yield { type: 'delta', delta: 'soy GlyphAI' }
      yield { type: 'done' }
    })

    const { result } = renderHook(() => useAIChat())

    act(() => result.current.setInput('Hola'))
    await act(async () => {
      await result.current.sendMessage()
    })

    await waitFor(() => expect(result.current.isStreaming).toBe(false))

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Hola' })
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Hola, soy GlyphAI',
    })
    expect(result.current.conversationId).toBe('conv-1')
    expect(result.current.error).toBeNull()
  })

  it('envía el conversation_id al servicio cuando la conversación es persistente', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'done' }
    })

    const { result } = renderHook(() => useAIChat('conv-existente'))

    act(() => result.current.setInput('sigo aquí'))
    await act(async () => {
      await result.current.sendMessage()
    })

    const [, sentConversationId] = mockStreamChat.mock.calls[0]
    expect(sentConversationId).toBe('conv-existente')
  })

  it('no envía nada con input vacío o mientras está generando', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'done' }
    })

    const { result } = renderHook(() => useAIChat())

    await act(async () => {
      await result.current.sendMessage()
    })
    expect(mockStreamChat).not.toHaveBeenCalled()

    act(() => result.current.setInput('hola'))
    await act(async () => {
      await result.current.sendMessage()
    })
    expect(mockStreamChat).toHaveBeenCalledTimes(1)
  })

  it('ignora envíos mientras GlyphAI está generando', async () => {
    let release: () => void = () => undefined
    mockStreamChat.mockImplementation(async function* () {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      yield { type: 'done' }
    })

    const { result } = renderHook(() => useAIChat())

    act(() => result.current.setInput('primero'))
    const firstSend = result.current.sendMessage()

    // Durante el streaming: el input se limpió y sendMessage no reenvía.
    act(() => result.current.setInput('segundo'))
    await act(async () => {
      await result.current.sendMessage()
    })
    expect(mockStreamChat).toHaveBeenCalledTimes(1)

    act(() => release())
    await act(async () => {
      await firstSend
    })
    expect(result.current.isStreaming).toBe(false)
  })

  it('muestra el error del evento SSE inline y limpia la burbuja vacía', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'error', message: 'Rate limit del proveedor' }
    })

    const { result } = renderHook(() => useAIChat())

    act(() => result.current.setInput('hola'))
    await act(async () => {
      await result.current.sendMessage()
    })

    expect(result.current.error).toBe('Rate limit del proveedor')
    expect(result.current.isStreaming).toBe(false)
    // La burbuja del asistente vacía se elimina.
    expect(result.current.messages).toHaveLength(1)
  })

  it('captura errores de red como error state', async () => {
    mockStreamChat.mockImplementation(() => {
      return {
        next: async () => {
          throw new Error('AI service not configured')
        },
        return: async () => ({ done: true, value: undefined }),
        throw: async (error: unknown) => {
          throw error
        },
        [Symbol.asyncIterator]() {
          return this
        },
      } as AsyncGenerator<AIStreamEvent>
    })

    const { result } = renderHook(() => useAIChat())

    act(() => result.current.setInput('hola'))
    await act(async () => {
      await result.current.sendMessage()
    })

    expect(result.current.error).toBe('AI service not configured')
    expect(result.current.isStreaming).toBe(false)
  })

  it('reset limpia mensajes, error y conversationId', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'conversation_id', conversationId: 'conv-1' }
      yield { type: 'done' }
    })

    const { result } = renderHook(() => useAIChat())

    act(() => result.current.setInput('hola'))
    await act(async () => {
      await result.current.sendMessage()
    })
    expect(result.current.conversationId).toBe('conv-1')

    act(() => result.current.reset())

    expect(result.current.messages).toEqual([])
    expect(result.current.conversationId).toBeNull()
    expect(result.current.error).toBeNull()
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAIChat } from './useAIChat'
import { streamChat, type AIStreamEvent } from '@/services/ai.service'
import { generateChatYoutubeDiscovery, type GenerateChatYoutubeResponse } from '@/services/youtube-discovery.service'

vi.mock('@/services/ai.service', () => ({
  streamChat: vi.fn(),
}))

vi.mock('@/services/youtube-discovery.service', () => ({
  generateChatYoutubeDiscovery: vi.fn(),
}))

const mockStreamChat = vi.mocked(streamChat)
const mockGenerateChatYoutube = vi.mocked(generateChatYoutubeDiscovery)

describe('useAIChat', () => {
  beforeEach(() => {
    mockStreamChat.mockReset()
    mockGenerateChatYoutube.mockReset()
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

  it('generateYoutubeDiscovery persiste sugerencias con metadata', async () => {
    mockGenerateChatYoutube.mockResolvedValue({
      conversation_id: 'conv-yt',
      suggestions: [
        {
          title: 'Death Note',
          type: 'anime',
          mentioned_by: 'The Anime Man',
          video_title: 'Top 10',
          video_url: 'https://www.youtube.com/watch?v=abc123',
          opinion: 'positive',
          rating: 9,
          timestamp: null,
          in_collection: false,
          external_url: null,
          cover_image_url: null,
        },
      ],
      metadata: {
        channels_analyzed: 1,
        videos_analyzed: 20,
        titles_found: 1,
        new_suggestions: 1,
        tokens_used: 0,
        analyzed_at: '2026-08-15T12:00:00Z',
      },
    })

    const { result } = renderHook(() => useAIChat())

    await act(async () => {
      await result.current.generateYoutubeDiscovery([
        'https://www.youtube.com/@TheAnimeMan',
      ])
    })

    expect(result.current.conversationId).toBe('conv-yt')
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].metadata?.suggestions).toHaveLength(1)
    expect(result.current.messages[1].content).toContain('Death Note')
    expect(result.current.isGeneratingYoutube).toBe(false)
  })

  it('generateYoutubeDiscovery muestra estado de carga temporal mientras analiza', async () => {
    let resolveAnalysis: (val: GenerateChatYoutubeResponse) => void = () => undefined
    mockGenerateChatYoutube.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve
        })
    )

    const { result } = renderHook(() => useAIChat())

    act(() => {
      void result.current.generateYoutubeDiscovery(['https://www.youtube.com/@iLuTV'])
    })

    // Mientras está en progreso
    expect(result.current.isGeneratingYoutube).toBe(true)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Descubre contenido de estos canales:\nhttps://www.youtube.com/@iLuTV',
    })
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: '',
      metadata: { loading: 'youtube' },
    })

    // Al resolverse
    await act(async () => {
      resolveAnalysis({
        conversation_id: 'conv-yt-123',
        suggestions: [
          {
            title: 'Evangelion',
            type: 'anime',
            mentioned_by: 'iLuTV',
            video_title: 'Video',
            video_url: 'https://youtube.com/watch?v=1',
            opinion: 'positive',
            rating: 10,
            timestamp: null,
            in_collection: false,
            external_url: null,
            cover_image_url: null,
          },
        ],
        metadata: {
          channels_analyzed: 1,
          videos_analyzed: 20,
          titles_found: 1,
          new_suggestions: 1,
          tokens_used: 0,
          analyzed_at: '2026-08-18T12:00:00Z',
        },
      })
    })

    expect(result.current.isGeneratingYoutube).toBe(false)
    expect(result.current.conversationId).toBe('conv-yt-123')
    expect(result.current.messages[1].content).toContain('Evangelion')
    expect(result.current.messages[1].metadata?.suggestions).toHaveLength(1)
  })

  it('permite continuar el chat enviando mensajes después del análisis de YouTube', async () => {
    mockGenerateChatYoutube.mockResolvedValue({
      conversation_id: 'conv-yt-456',
      suggestions: [],
      metadata: {
        channels_analyzed: 1,
        videos_analyzed: 20,
        titles_found: 0,
        new_suggestions: 0,
        tokens_used: 0,
        analyzed_at: '2026-08-18T12:00:00Z',
      },
    })

    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'delta', delta: 'Claro, te explico' }
      yield { type: 'done' }
    })

    const { result } = renderHook(() => useAIChat())

    await act(async () => {
      await result.current.generateYoutubeDiscovery(['https://www.youtube.com/@iLuTV'])
    })

    expect(result.current.conversationId).toBe('conv-yt-456')

    // Ahora enviamos un mensaje de seguimiento
    act(() => result.current.setInput('Cuéntame más'))
    await act(async () => {
      await result.current.sendMessage()
    })

    expect(mockStreamChat).toHaveBeenCalledTimes(1)
    const [sentHistory, sentConvId] = mockStreamChat.mock.calls[0]
    expect(sentConvId).toBe('conv-yt-456')
    expect(sentHistory).toHaveLength(3) // user (youtube), assistant (resumen), user (seguimiento)
    expect(result.current.messages).toHaveLength(4)
    expect(result.current.messages[3].content).toBe('Claro, te explico')
  })

  it('generateYoutubeDiscovery maneja error de API extrayendo el detail claro', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 503,
        data: {
          detail:
            'YouTube discovery no está disponible en este momento. Configure YOUTUBE_API_KEY para habilitar esta funcionalidad.',
        },
      },
    }
    mockGenerateChatYoutube.mockRejectedValue(axiosError)

    const { result } = renderHook(() => useAIChat())

    await act(async () => {
      await result.current.generateYoutubeDiscovery([
        'https://www.youtube.com/@TheAnimeMan',
      ])
    })

    expect(result.current.error).toBe(
      'YouTube discovery no está disponible en este momento. Configure YOUTUBE_API_KEY para habilitar esta funcionalidad.'
    )
    expect(result.current.isGeneratingYoutube).toBe(false)
  })
})

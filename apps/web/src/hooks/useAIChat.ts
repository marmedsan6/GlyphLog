/**
 * Hook del chat de GlyphAI.
 *
 * Gestiona el estado efímero del chat (mensajes, streaming, errores) sobre
 * `streamChat`. Usado por el widget flotante (#46) y por la página /chat (#47).
 *
 * - Sin `conversationId`: el backend crea una conversación nueva en el primer
 *   mensaje y el hook la expone vía `conversationId` (evento SSE inicial).
 * - Con `conversationId`: los mensajes se persisten en esa conversación.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  generateChatRecommendations,
  streamChat,
  type ChatMessageInput,
  type ChatMessageMetadata,
} from '@/services/ai.service'
import type { Recommendation } from '@/services/recommendation.service'
import { generateChatYoutubeDiscovery } from '@/services/youtube-discovery.service'
import type { YoutubeSuggestion } from '@/types/youtube-discovery'
import type { EntryType } from '@/types'
import { getApiErrorMessage } from '@/utils/api-errors'

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: ChatMessageMetadata | null
}

export interface UseAIChatReturn {
  messages: AIChatMessage[]
  input: string
  setInput: (value: string) => void
  isStreaming: boolean
  error: string | null
  conversationId: string | null
  sendMessage: (textOverride?: string) => Promise<void>
  generateRecommendations: (type: EntryType) => Promise<void>
  isGeneratingRecommendations: boolean
  generateYoutubeDiscovery: (channelUrls: string[]) => Promise<void>
  isGeneratingYoutube: boolean
  reset: () => void
}

function newMessage(
  role: 'user' | 'assistant',
  content = '',
  metadata: ChatMessageMetadata | null = null
): AIChatMessage {
  return { id: crypto.randomUUID(), role, content, metadata }
}

const EMPTY_MESSAGES: AIChatMessage[] = []

export function useAIChat(
  initialConversationId?: string | null,
  initialMessages: AIChatMessage[] = EMPTY_MESSAGES
): UseAIChatReturn {
  const [messages, setMessages] = useState<AIChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [isGeneratingYoutube, setIsGeneratingYoutube] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  )

  // Refs para leer el estado dentro de sendMessage sin re-crear el callback
  // y sin closures obsoletos.
  const messagesRef = useRef<AIChatMessage[]>([])
  const conversationIdRef = useRef<string | null>(conversationId)
  const isStreamingRef = useRef(false)
  const isGeneratingRecRef = useRef(false)
  const isGeneratingYtRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Al cambiar de conversación externa (p. ej. selección en sidebar),
  // se carga su historial. Si el ID ya coincide con el actual creado localmente,
  // preservamos los mensajes locales para no pisar el estado activo.
  useEffect(() => {
    if (initialConversationId !== conversationIdRef.current) {
      conversationIdRef.current = initialConversationId ?? null
      setConversationId(initialConversationId ?? null)
      setMessages(initialMessages)
      setError(null)
    } else if (initialMessages.length > 0 && messagesRef.current.length === 0) {
      setMessages(initialMessages)
    }
  }, [initialConversationId, initialMessages])

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const content = (textOverride ?? input).trim()
      if (
        !content ||
        isStreamingRef.current ||
        isGeneratingRecRef.current ||
        isGeneratingYtRef.current
      )
        return

      const userMessage = newMessage('user', content)
      const assistantMessage = newMessage('assistant')
      const history: ChatMessageInput[] = [
        ...messagesRef.current.filter((m) => m.content !== ''),
        userMessage,
      ].map((message) => ({ role: message.role, content: message.content }))

      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setInput('')
      setError(null)
      setIsStreaming(true)
      isStreamingRef.current = true

      try {
        for await (const event of streamChat(history, conversationIdRef.current)) {
          if (event.type === 'conversation_id') {
            conversationIdRef.current = event.conversationId
            setConversationId(event.conversationId)
          } else if (event.type === 'delta') {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: message.content + event.delta }
                  : message
              )
            )
          } else if (event.type === 'error') {
            setError(event.message)
            break
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado al contactar con GlyphAI')
      } finally {
        // Si la respuesta falló antes de emitir nada, la burbuja del asistente
        // quedaría vacía — se elimina para no mostrar un hueco sin contenido.
        setMessages((prev) =>
          prev.filter((message) => message.id !== assistantMessage.id || message.content !== '')
        )
        setIsStreaming(false)
        isStreamingRef.current = false
      }
    },
    [input]
  )

  const generateRecommendations = useCallback(
    async (type: EntryType) => {
      if (isStreamingRef.current || isGeneratingRecRef.current) return

      setIsGeneratingRecommendations(true)
      isGeneratingRecRef.current = true
      setError(null)

      const userMessage = newMessage('user', `Recomiéndame ${type}`)
      const loadingAssistantMessage = newMessage('assistant', '', { loading: 'recommendations' })
      setMessages((prev) => [...prev, userMessage, loadingAssistantMessage])

      try {
        const result = await generateChatRecommendations(
          type,
          conversationIdRef.current
        )

        // Actualiza el id de la conversación (creada si no existía).
        conversationIdRef.current = result.conversation_id
        setConversationId(result.conversation_id)

        // Actualiza el mensaje temporal del asistente con su payload estructurado (tarjetas).
        const assistantContent = formatRecommendationsText(result.recommendations, type)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingAssistantMessage.id
              ? {
                  ...m,
                  content: assistantContent,
                  metadata: { recommendations: result.recommendations },
                }
              : m
          )
        )
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== loadingAssistantMessage.id))
        setError(getApiErrorMessage(err, 'Error inesperado al generar recomendaciones'))
      } finally {
        setIsGeneratingRecommendations(false)
        isGeneratingRecRef.current = false
      }
    },
    []
  )

  const generateYoutubeDiscovery = useCallback(
    async (channelUrls: string[]) => {
      if (isStreamingRef.current || isGeneratingYtRef.current) return

      setIsGeneratingYoutube(true)
      isGeneratingYtRef.current = true
      setError(null)

      const userMessage = newMessage(
        'user',
        `Descubre contenido de estos canales:\n${channelUrls.join('\n')}`
      )
      const loadingAssistantMessage = newMessage('assistant', '', { loading: 'youtube' })
      setMessages((prev) => [...prev, userMessage, loadingAssistantMessage])

      try {
        const result = await generateChatYoutubeDiscovery(
          channelUrls,
          conversationIdRef.current
        )

        // Actualiza el id de la conversación (creada si no existía).
        conversationIdRef.current = result.conversation_id
        setConversationId(result.conversation_id)

        // Actualiza el mensaje temporal del asistente con su payload estructurado (tarjetas).
        const assistantContent = formatYoutubeText(result.suggestions)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingAssistantMessage.id
              ? {
                  ...m,
                  content: assistantContent,
                  metadata: { suggestions: result.suggestions },
                }
              : m
          )
        )
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== loadingAssistantMessage.id))
        setError(getApiErrorMessage(err, 'Error inesperado al analizar canales'))
      } finally {
        setIsGeneratingYoutube(false)
        isGeneratingYtRef.current = false
      }
    },
    []
  )

  const reset = useCallback(() => {
    setMessages([])
    setInput('')
    setError(null)
    conversationIdRef.current = null
    setConversationId(null)
    setIsGeneratingRecommendations(false)
    setIsGeneratingYoutube(false)
    isGeneratingRecRef.current = false
    isGeneratingYtRef.current = false
  }, [])

  return {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    conversationId,
    sendMessage,
    generateRecommendations,
    isGeneratingRecommendations,
    generateYoutubeDiscovery,
    isGeneratingYoutube,
    reset,
  }
}

function formatRecommendationsText(
  recommendations: Recommendation[],
  type: EntryType
): string {
  const labels: Record<EntryType, string> = {
    anime: 'animes',
    manga: 'mangas',
    game: 'videojuegos',
  }
  const header = `Te he recomendado estos ${recommendations.length} ${labels[type]}:`
  const lines = recommendations.map(
    (rec) => `- ${rec.title} (${rec.match_percentage}% match): ${rec.reason}`
  )
  return [header, ...lines].join('\n')
}

function formatYoutubeText(suggestions: YoutubeSuggestion[]): string {
  if (suggestions.length === 0) {
    return 'No encontré menciones de anime/manga/videojuegos en esos canales.'
  }
  const header = `Estas son las ${suggestions.length} menciones que he encontrado:`
  const lines = suggestions.map((suggestion) => {
    const status = suggestion.in_collection ? 'ya en tu lista' : 'nuevo'
    return `- ${suggestion.title} (${suggestion.type}, ${status}) mencionado por ${suggestion.mentioned_by}`
  })
  return [header, ...lines].join('\n')
}

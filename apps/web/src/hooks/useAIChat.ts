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
import { streamChat, type ChatMessageInput } from '@/services/ai.service'

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface UseAIChatReturn {
  messages: AIChatMessage[]
  input: string
  setInput: (value: string) => void
  isStreaming: boolean
  error: string | null
  conversationId: string | null
  sendMessage: (textOverride?: string) => Promise<void>
  reset: () => void
}

function newMessage(role: 'user' | 'assistant', content = ''): AIChatMessage {
  return { id: crypto.randomUUID(), role, content }
}

const EMPTY_MESSAGES: AIChatMessage[] = []

export function useAIChat(
  initialConversationId?: string | null,
  initialMessages: AIChatMessage[] = EMPTY_MESSAGES
): UseAIChatReturn {
  const [messages, setMessages] = useState<AIChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  )

  // Refs para leer el estado dentro de sendMessage sin re-crear el callback
  // y sin closures obsoletos.
  const messagesRef = useRef<AIChatMessage[]>([])
  const conversationIdRef = useRef<string | null>(conversationId)
  const isStreamingRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Al cambiar de conversación (página /chat), se carga su historial y se
  // resetea el hilo local. Solo reacciona al PARÁMETRO, no al conversationId
  // interno (que cambia cuando el backend crea una conversación nueva).
  useEffect(() => {
    conversationIdRef.current = initialConversationId ?? null
    setConversationId(initialConversationId ?? null)
    setMessages(initialMessages)
    setError(null)
  }, [initialConversationId, initialMessages])

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const content = (textOverride ?? input).trim()
      if (!content || isStreamingRef.current) return

      const userMessage = newMessage('user', content)
      const assistantMessage = newMessage('assistant')
      const history: ChatMessageInput[] = [
        ...messagesRef.current,
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

  const reset = useCallback(() => {
    setMessages([])
    setInput('')
    setError(null)
    conversationIdRef.current = null
    setConversationId(null)
  }, [])

  return { messages, input, setInput, isStreaming, error, conversationId, sendMessage, reset }
}

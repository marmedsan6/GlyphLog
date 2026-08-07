/**
 * Servicio de IA de GlyphAI (chat con streaming SSE).
 *
 * - `streamChat`: POST /ai/chat con fetch nativo + ReadableStream.
 *   No se usa axios ni EventSource porque necesitamos enviar body (POST)
 *   y leer el stream incrementalmente. EventSource solo soporta GET.
 * - `getConversations` / `getConversation` / `deleteConversation`:
 *   CRUD de conversaciones persistentes (issue #45/#47) vía apiClient.
 */

import { apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { getAccessToken } from '@/lib/auth-token'
import { clearSession } from '@/lib/session'
import type { components } from '@/types/api'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessageInput {
  role: ChatRole
  content: string
}

export type ConversationListItem = components['schemas']['ConversationListItem']
export type ConversationResponse = components['schemas']['ConversationResponse']
export type ChatMessageResponse = components['schemas']['ChatMessageResponse']
export type PaginatedConversationsResponse =
  components['schemas']['PaginatedConversationsResponse']

/** Eventos parseados del stream SSE de /ai/chat. */
export type AIStreamEvent =
  | { type: 'conversation_id'; conversationId: string }
  | { type: 'delta'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

const CHAT_ENDPOINT = `${env.apiUrl}/ai/chat`

/**
 * Envía los mensajes a GlyphAI y consume la respuesta en streaming (SSE).
 *
 * El backend emite:
 *   1. `data: {"conversation_id": "..."}` — id de la conversación creada/reanudada
 *   2. `data: {"delta": "texto"}` × N
 *   3. `data: [DONE]` — o `data: {"error": "..."}` si falla a mitad del stream
 *
 * Errores HTTP: 401 → sesión expirada (limpiar y redirigir, como el interceptor
 * de axios); 503 → servicio no configurado; 422/502 → detail del backend.
 */
export async function* streamChat(
  messages: ChatMessageInput[],
  conversationId?: string | null
): AsyncGenerator<AIStreamEvent> {
  const token = getAccessToken()
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      messages,
      conversation_id: conversationId ?? null,
    }),
  })

  if (response.status === 401) {
    // Misma política que el interceptor de axios: limpiar sesión y avisar.
    clearSession()
    window.location.href = '/login?sessionExpired=1'
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
  }

  if (!response.ok) {
    throw new Error(await extractApiError(response))
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Tu navegador no soporta streaming de respuestas.')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Los eventos SSE llegan separados por \n\n; se procesan línea a línea.
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice('data: '.length)
      if (payload === '[DONE]') {
        yield { type: 'done' }
        return
      }
      try {
        const data: Record<string, unknown> = JSON.parse(payload)
        if (typeof data.conversation_id === 'string') {
          yield { type: 'conversation_id', conversationId: data.conversation_id }
        } else if (typeof data.delta === 'string') {
          yield { type: 'delta', delta: data.delta }
        } else if (typeof data.error === 'string') {
          yield { type: 'error', message: data.error }
        }
      } catch {
        // Chunk malformado: se ignora y se sigue con el siguiente.
      }
    }
  }
}

/** Extrae el `detail` del body de error del backend con fallback genérico. */
async function extractApiError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === 'string') return detail
    }
  } catch {
    // body no JSON — se usa el fallback
  }
  return `Error del servidor (${response.status})`
}

// ── Conversaciones persistentes (issue #45/#47) ─────────────────────────────

export async function getConversations(
  page = 1,
  limit = 15
): Promise<PaginatedConversationsResponse> {
  const response = await apiClient.get<PaginatedConversationsResponse>(
    '/ai/conversations',
    { params: { page, limit } }
  )
  return response.data
}

export async function getConversation(id: string): Promise<ConversationResponse> {
  const response = await apiClient.get<ConversationResponse>(`/ai/conversations/${id}`)
  return response.data
}

export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/ai/conversations/${id}`)
}

/**
 * Servicio para el sistema de descubrimiento desde YouTube.
 */

import { apiClient } from '@/lib/api-client'
import type {
  AnalysisMetadata,
  YoutubeAnalysisRequest,
  YoutubeAnalysisResponse,
  YoutubeSuggestion,
} from '@/types/youtube-discovery'
import type { EntryCreate } from '@/types'

/**
 * Analiza canales de YouTube y genera sugerencias de contenido.
 *
 * @param channelUrls - Lista de URLs de canales (máximo 5)
 * @returns Sugerencias y metadata del análisis
 */
export async function analyzeChannels(
  channelUrls: string[]
): Promise<YoutubeAnalysisResponse> {
  const body: YoutubeAnalysisRequest = {
    channel_urls: channelUrls,
  }

  const response = await apiClient.post<YoutubeAnalysisResponse>(
    '/discover/youtube/analyze',
    body
  )

  return response.data
}

/**
 * Respuesta del descubrimiento de YouTube desde el chat.
 */
export interface GenerateChatYoutubeResponse {
  conversation_id: string
  suggestions: YoutubeSuggestion[]
  metadata: AnalysisMetadata
}

/**
 * Lanza el descubrimiento de YouTube desde el chat y persiste las sugerencias
 * en la conversación (POST /ai/youtube).
 *
 * @param channelUrls - URLs de canales pegadas (máximo 5)
 * @param conversationId - Conversación a la que asociar (opcional)
 */
export async function generateChatYoutubeDiscovery(
  channelUrls: string[],
  conversationId?: string | null
): Promise<GenerateChatYoutubeResponse> {
  const response = await apiClient.post<GenerateChatYoutubeResponse>(
    '/ai/youtube',
    {
      channel_urls: channelUrls,
      conversation_id: conversationId ?? null,
    }
  )
  return response.data
}

/**
 * Añade una sugerencia a la colección del usuario.
 *
 * @param suggestion - Sugerencia a añadir
 * @returns Entrada creada
 */
export async function addSuggestionToCollection(
  title: string,
  type: 'anime' | 'manga' | 'game'
) {
  const body: EntryCreate = {
    title,
    type,
    status: 'plan_to_watch',
    rating: null,
    year: null,
    notes: null,
    cover_image: null,
    progress_total: null,
  }

  const response = await apiClient.post('/entries/', body)
  return response.data
}

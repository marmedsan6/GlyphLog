/**
 * Servicio para el sistema de descubrimiento desde YouTube.
 */

import { apiClient } from '@/lib/api-client'
import type {
  YoutubeAnalysisRequest,
  YoutubeAnalysisResponse,
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
    cover_image_url: null,
    progress_total: null,
    current_progress: null,
  }

  const response = await apiClient.post('/entries/', body)
  return response.data
}

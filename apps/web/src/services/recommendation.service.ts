/**
 * Servicio de recomendaciones personalizadas con Claude.
 */

import { apiClient } from '@/lib/api-client'
import type { EntryType } from '@/types'

export interface Recommendation {
  title: string
  type: EntryType
  match_percentage: number
  reason: string
  genres: string[]
  year: number | null
  external_url: string | null
  cover_image_url: string | null
  similar_to: string[]
}

export interface RecommendationMetadata {
  analyzed_entries: number
  favorite_genres: string[]
  avg_rating: number
  completion_rate: number
  tokens_used: number | null
  model: string
}

export interface GenerateRecommendationsRequest {
  type?: EntryType
  limit?: number
}

export interface GenerateRecommendationsResponse {
  recommendations: Recommendation[]
  metadata: RecommendationMetadata
}

/**
 * Genera recomendaciones personalizadas analizando la colección del usuario con Claude.
 */
export async function generateRecommendations(
  request: GenerateRecommendationsRequest = {}
): Promise<GenerateRecommendationsResponse> {
  const response = await apiClient.post<GenerateRecommendationsResponse>(
    '/recommendations/generate',
    request
  )
  return response.data
}

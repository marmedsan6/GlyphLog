import { apiClient } from '@/lib/api-client'
import type { ExternalSearchResponse, GameDetailResponse } from '@/types'

export async function searchExternal(query: string): Promise<ExternalSearchResponse> {
  const response = await apiClient.get<ExternalSearchResponse>('/external/search', {
    params: { q: query },
  })
  return response.data
}

export async function getGameDetail(slug: string): Promise<GameDetailResponse> {
  const response = await apiClient.get<GameDetailResponse>(`/external/games/${encodeURIComponent(slug)}`)
  return response.data
}

import { apiClient } from '@/lib/api-client'
import type { EntryType, ExternalSearchResponse, GameDetailResponse } from '@/types'

export async function searchExternal(
  query: string,
  type?: EntryType
): Promise<ExternalSearchResponse> {
  const response = await apiClient.get<ExternalSearchResponse>('/external/search', {
    params: { q: query, ...(type ? { type } : {}) },
  })
  return response.data
}

export async function getGameDetail(slug: string): Promise<GameDetailResponse> {
  const response = await apiClient.get<GameDetailResponse>(`/external/games/${encodeURIComponent(slug)}`)
  return response.data
}

import { apiClient } from '@/lib/api-client'
import type { EntryType, ExternalSearchResponse, GamePlaytimeResponse } from '@/types'

export async function searchExternal(
  query: string,
  type?: EntryType
): Promise<ExternalSearchResponse> {
  const response = await apiClient.get<ExternalSearchResponse>('/external/search', {
    params: { q: query, ...(type ? { type } : {}) },
  })
  return response.data
}

export async function getGamePlaytime(title: string): Promise<GamePlaytimeResponse> {
  const response = await apiClient.get<GamePlaytimeResponse>(`/external/games/playtime`, {
    params: { title },
  })
  return response.data
}

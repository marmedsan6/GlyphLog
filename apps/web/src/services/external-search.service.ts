import { apiClient } from '@/lib/api-client'
import type { ExternalSearchResponse } from '@/types'

export async function searchExternal(query: string): Promise<ExternalSearchResponse> {
  const response = await apiClient.get<ExternalSearchResponse>('/external/search', {
    params: { q: query },
  })
  return response.data
}

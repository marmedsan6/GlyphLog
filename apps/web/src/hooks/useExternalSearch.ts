import { useQuery } from '@tanstack/react-query'
import { searchExternal } from '@/services/external-search.service'
import type { EntryType, ExternalSearchResponse } from '@/types'

export const EXTERNAL_SEARCH_QUERY_KEY = 'external-search' as const

interface UseExternalSearchResult {
  results: ExternalSearchResponse['results']
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useExternalSearch(
  search: string,
  type: EntryType
): UseExternalSearchResult {
  const query = useQuery({
    queryKey: [EXTERNAL_SEARCH_QUERY_KEY, search, type],
    queryFn: () => searchExternal(search.trim(), type),
    enabled: search.trim().length >= 3, // Se activa solo si tiene al menos 3 caracteres
    staleTime: 60_000, // Cacheamos las búsquedas por 1 minuto
    retry: false, // No reintentar ante fallos (MAL/RAWG caídos) para no sobrecargar
  })

  return {
    results: query.data?.results ?? [],
    isLoading: query.isLoading && query.fetchStatus !== 'idle',
    isError: query.isError,
    error: query.error,
  }
}

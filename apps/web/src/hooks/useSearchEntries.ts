import { useQuery } from '@tanstack/react-query'
import { getEntries } from '@/services/entry.service'
import type { PaginatedEntryResponse } from '@/types'

export const SEARCH_ENTRIES_QUERY_KEY = 'search-entries' as const

interface UseSearchEntriesResult {
  entries: PaginatedEntryResponse['entries']
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useSearchEntries(search: string): UseSearchEntriesResult {
  const query = useQuery({
    queryKey: [SEARCH_ENTRIES_QUERY_KEY, search],
    queryFn: () =>
      getEntries({
        search: search.trim(),
        limit: 5, // Límite de 5 resultados rápidos para el dropdown del header
      }),
    enabled: search.trim().length >= 2, // Se activa solo si tiene al menos 2 caracteres
    staleTime: 30_000, // Cacheamos las búsquedas por 30 segundos
  })

  return {
    entries: query.data?.entries ?? [],
    isLoading: query.isLoading && query.fetchStatus !== 'idle',
    isError: query.isError,
    error: query.error,
  }
}

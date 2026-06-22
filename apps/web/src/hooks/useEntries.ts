import { useQuery, type QueryObserverResult } from '@tanstack/react-query'
import { useState } from 'react'
import { getEntries } from '@/services/entry.service'
import type { EntryType, PaginatedEntryResponse } from '@/types'

export const ENTRIES_QUERY_KEY = 'entries' as const

const DEFAULT_LIMIT = 15

export type EntryFilterType = EntryType | 'all'

interface UseEntriesResult {
  entries: PaginatedEntryResponse['entries']
  total: number
  page: number
  totalPages: number
  type: EntryFilterType
  isLoading: boolean
  isError: boolean
  error: Error | null
  setPage: (page: number) => void
  setType: (type: EntryFilterType) => void
  refetch: () => Promise<QueryObserverResult<PaginatedEntryResponse, Error>>
}

export function useEntries(): UseEntriesResult {
  const [type, setType] = useState<EntryFilterType>('all')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [ENTRIES_QUERY_KEY, { type, page }],
    queryFn: () =>
      getEntries({
        type: type === 'all' ? undefined : type,
        page,
        limit: DEFAULT_LIMIT,
      }),
    staleTime: 60_000,
  })

  function handleSetType(newType: EntryFilterType): void {
    setType(newType)
    setPage(1)
  }

  const data = query.data
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 0

  return {
    entries: data?.entries ?? [],
    total,
    page: data?.page ?? page,
    totalPages,
    type,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    setPage,
    setType: handleSetType,
    refetch: query.refetch,
  }
}

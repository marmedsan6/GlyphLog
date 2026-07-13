import { useQuery, type QueryObserverResult } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { getEntries } from '@/services/entry.service'
import type { EntryType, PaginatedEntryResponse, SortField, SortOrder } from '@/types'

export const ENTRIES_QUERY_KEY = 'entries' as const

const DEFAULT_LIMIT = 15

export type EntryFilterType = EntryType | 'all'

interface UseEntriesResult {
  entries: PaginatedEntryResponse['entries']
  total: number
  page: number
  totalPages: number
  type: EntryFilterType
  search: string
  sortBy: SortField
  sortOrder: SortOrder
  isLoading: boolean
  isError: boolean
  error: Error | null
  setPage: (page: number) => void
  setType: (type: EntryFilterType) => void
  setSearch: (search: string) => void
  setSort: (sortBy: SortField, sortOrder: SortOrder) => void
  refetch: () => Promise<QueryObserverResult<PaginatedEntryResponse, Error>>
}

export function useEntries(): UseEntriesResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const type = (searchParams.get('type') as EntryFilterType) || 'all'
  const search = searchParams.get('search') || ''
  const sortBy = (searchParams.get('sort_by') as SortField) || 'created_at'
  const sortOrder = (searchParams.get('sort_order') as SortOrder) || 'desc'
  const page = parseInt(searchParams.get('page') || '1', 10)

  const query = useQuery({
    queryKey: [ENTRIES_QUERY_KEY, { type, search, sortBy, sortOrder, page }],
    queryFn: () =>
      getEntries({
        type: type === 'all' ? undefined : type,
        search: search.trim() || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: DEFAULT_LIMIT,
      }),
    staleTime: 60_000,
  })

  function setPage(newPage: number): void {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(newPage))
    setSearchParams(nextParams)
  }

  function handleSetType(newType: EntryFilterType): void {
    const nextParams = new URLSearchParams(searchParams)
    if (newType === 'all') {
      nextParams.delete('type')
    } else {
      nextParams.set('type', newType)
    }
    nextParams.set('page', '1') // Al filtrar por tipo, reseteamos a la página 1
    setSearchParams(nextParams)
  }

  function handleSetSearch(newSearch: string): void {
    const nextParams = new URLSearchParams(searchParams)
    const trimmed = newSearch.trim()
    if (!trimmed) {
      nextParams.delete('search')
    } else {
      nextParams.set('search', trimmed)
    }
    nextParams.set('page', '1') // Al buscar, reseteamos a la página 1
    setSearchParams(nextParams)
  }

  function handleSetSort(newSortBy: SortField, newSortOrder: SortOrder): void {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('sort_by', newSortBy)
    nextParams.set('sort_order', newSortOrder)
    nextParams.set('page', '1') // Al cambiar el orden, reseteamos a la página 1
    setSearchParams(nextParams)
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
    search,
    sortBy,
    sortOrder,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    setPage,
    setType: handleSetType,
    setSearch: handleSetSearch,
    setSort: handleSetSort,
    refetch: query.refetch,
  }
}


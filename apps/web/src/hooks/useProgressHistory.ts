import { useInfiniteQuery } from '@tanstack/react-query'
import { getProgressHistory, type PaginatedProgressHistory } from '@/services/entry.service'

export const PROGRESS_HISTORY_QUERY_KEY = 'progress-history' as const

export function useProgressHistory(entryId: string, enabled: boolean = true) {
  return useInfiniteQuery<PaginatedProgressHistory, Error>({
    queryKey: [PROGRESS_HISTORY_QUERY_KEY, entryId],
    queryFn: ({ pageParam }) => getProgressHistory(entryId, pageParam as string | null),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
    initialPageParam: null,
    enabled: Boolean(entryId) && enabled,
    staleTime: 60_000,
  })
}

import { useQuery } from '@tanstack/react-query'
import { getEntry } from '@/services/entry.service'
import type { EntryResponse } from '@/types'

export function useEntry(id: string) {
  return useQuery<EntryResponse, Error>({
    queryKey: ['entry', id],
    queryFn: () => getEntry(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntry } from '@/services/entry.service'
import type { EntryCreate, EntryResponse } from '@/types'
import { ENTRIES_QUERY_KEY } from './useEntries'

export function useCreateEntry() {
  const queryClient = useQueryClient()

  return useMutation<EntryResponse, Error, EntryCreate>({
    mutationFn: createEntry,
    onSuccess: () => {
      // Invalidamos todas las queries de listado para que, al volver a la
      // colección, la nueva entrada aparezca sin necesidad de refrescar.
      queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
    },
  })
}

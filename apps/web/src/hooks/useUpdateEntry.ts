import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateEntry } from '@/services/entry.service'
import type { EntryResponse, EntryUpdateFormData } from '@/types'
import { ENTRIES_QUERY_KEY } from './useEntries'

export function useUpdateEntry(id: string) {
  const queryClient = useQueryClient()

  return useMutation<EntryResponse, Error, EntryUpdateFormData>({
    mutationFn: (data) => updateEntry(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entry', id] })
      await queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
    },
  })
}

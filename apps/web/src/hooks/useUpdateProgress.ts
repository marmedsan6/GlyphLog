import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProgress, type UpdateProgressData } from '@/services/entry.service'
import type { EntryResponse } from '@/types'
import { ENTRIES_QUERY_KEY } from './useEntries'
import { PROGRESS_HISTORY_QUERY_KEY } from './useProgressHistory'

export function useUpdateProgress(entryId: string) {
  const queryClient = useQueryClient()

  return useMutation<EntryResponse, Error, UpdateProgressData>({
    mutationFn: (data) => updateProgress(entryId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entry', entryId] })
      await queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
      await queryClient.invalidateQueries({ queryKey: [PROGRESS_HISTORY_QUERY_KEY, entryId] })
    },
  })
}


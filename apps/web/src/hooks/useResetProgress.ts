import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resetProgress } from '@/services/entry.service'
import type { EntryResponse, EntryType } from '@/types'
import { ENTRIES_QUERY_KEY } from './useEntries'
import { PROGRESS_HISTORY_QUERY_KEY } from './useProgressHistory'

export interface ResetProgressVariables {
  reason?: string | null
  new_type?: EntryType | null
  new_progress_total?: number | null
}

export function useResetProgress(entryId: string) {
  const queryClient = useQueryClient()

  return useMutation<EntryResponse, Error, ResetProgressVariables>({
    mutationFn: (variables) => resetProgress(entryId, variables),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entry', entryId] })
      await queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
      await queryClient.invalidateQueries({ queryKey: [PROGRESS_HISTORY_QUERY_KEY, entryId] })
    },
  })
}


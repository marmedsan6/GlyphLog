import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProgress } from '@/services/entry.service'
import type { EntryResponse, PaginatedEntryResponse } from '@/types'
import { ENTRIES_QUERY_KEY } from './useEntries'

interface QuickProgressVariables {
  entryId: string
  newValue: number
  mark_completed?: boolean
}

interface MutationContext {
  previousEntriesQueries: [readonly unknown[], PaginatedEntryResponse | undefined][]
  previousEntry?: EntryResponse
}

export function useQuickProgress() {
  const queryClient = useQueryClient()

  return useMutation<EntryResponse, Error, QuickProgressVariables, MutationContext>({
    mutationFn: ({ entryId, newValue, mark_completed }) =>
      updateProgress(entryId, { new_value: newValue, mark_completed: mark_completed ?? false }),

    onMutate: async ({ entryId, newValue, mark_completed }) => {
      // 1. Cancelar queries salientes para evitar overwrites
      await queryClient.cancelQueries({ queryKey: [ENTRIES_QUERY_KEY] })
      await queryClient.cancelQueries({ queryKey: ['entry', entryId] })

      // 2. Snapshot de valores previos
      const previousEntriesQueries = queryClient.getQueriesData<PaginatedEntryResponse>({
        queryKey: [ENTRIES_QUERY_KEY],
      })
      const previousEntry = queryClient.getQueryData<EntryResponse>(['entry', entryId])

      // 3. Optimistic update en listado de colección
      previousEntriesQueries.forEach(([queryKey, oldData]) => {
        if (!oldData) return
        queryClient.setQueryData<PaginatedEntryResponse>(queryKey, {
          ...oldData,
          entries: oldData.entries.map((entry) => {
            if (entry.id === entryId) {
              return {
                ...entry,
                current_progress: newValue,
                status: mark_completed && entry.progress_total === newValue ? 'completed' : entry.status,
              }
            }
            return entry
          }),
        })
      })

      // 4. Optimistic update en detalle
      if (previousEntry) {
        queryClient.setQueryData<EntryResponse>(['entry', entryId], {
          ...previousEntry,
          current_progress: newValue,
          status: mark_completed && previousEntry.progress_total === newValue ? 'completed' : previousEntry.status,
        })
      }

      return { previousEntriesQueries, previousEntry }
    },

    onError: (_err, variables, context) => {
      // Rollback a los valores anteriores si hay error
      if (context?.previousEntriesQueries) {
        context.previousEntriesQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData)
        })
      }
      if (context?.previousEntry) {
        queryClient.setQueryData(['entry', variables.entryId], context.previousEntry)
      }
    },

    onSuccess: (_data, variables) => {
      // Invalidar para sincronizar
      void queryClient.invalidateQueries({ queryKey: ['entry', variables.entryId] })
      void queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
    },
  })
}

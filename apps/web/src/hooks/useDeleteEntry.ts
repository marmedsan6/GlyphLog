import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { deleteEntry } from '@/services/entry.service'
import { ENTRIES_QUERY_KEY } from './useEntries'

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<void, Error, string>({
    mutationFn: deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ENTRIES_QUERY_KEY] })
      navigate('/collection')
    },
  })
}

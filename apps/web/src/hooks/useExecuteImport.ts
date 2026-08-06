/**
 * Hook para ejecutar importación de entradas parseadas.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executeImport, type ImportExecuteRequest, type ImportExecuteResponse } from '@/services/import.service'

export function useExecuteImport() {
  const queryClient = useQueryClient()

  return useMutation<ImportExecuteResponse, Error, ImportExecuteRequest>({
    mutationFn: executeImport,
    onSuccess: () => {
      // Invalidar la colección para que se recargue con las nuevas entradas
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
  })
}

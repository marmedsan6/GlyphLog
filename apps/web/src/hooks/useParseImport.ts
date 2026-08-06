/**
 * Hook para parsear listas de importación con Claude.
 */

import { useMutation } from '@tanstack/react-query'
import { parseImport, type ImportParseRequest, type ImportParseResponse } from '@/services/import.service'

export function useParseImport() {
  return useMutation<ImportParseResponse, Error, ImportParseRequest>({
    mutationFn: parseImport,
  })
}

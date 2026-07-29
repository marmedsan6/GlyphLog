import { isAxiosError } from 'axios'

interface ValidationErrorDetail {
  loc: (string | number)[]
  msg: string
  type: string
}

interface ApiErrorResponse {
  detail?: string | ValidationErrorDetail[]
}

/**
 * Extrae un mensaje legible de un error de API.
 *
 * Soporta dos formatos de respuesta 422 de FastAPI:
 * - { detail: string }
 * - { detail: [{ msg: string, ... }] }
 *
 * Fallback a un mensaje genérico si no se puede determinar la causa.
 */
export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err) && err.response) {
    const data = err.response.data as ApiErrorResponse

    if (typeof data.detail === 'string') {
      return data.detail
    }

    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .filter((item): item is ValidationErrorDetail => typeof item?.msg === 'string')
        .map((item) => item.msg)

      if (messages.length > 0) {
        return messages.join('; ')
      }
    }
  }

  return 'Error inesperado. Inténtalo de nuevo.'
}

/**
 * Determina si un error de API es un conflicto 409.
 */
export function isConflictError(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 409
}

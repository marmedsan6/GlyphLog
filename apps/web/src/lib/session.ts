import { clearAccessToken } from '@/lib/auth-token'
import { queryClient } from '@/lib/query-client'

/**
 * Limpia por completo la sesión activa del usuario.
 *
 * Centraliza la limpieza del token y la caché de TanStack Query para evitar
 * duplicación en el store de auth y en el interceptor 401 del apiClient.
 * No modifica el estado de Zustand: es responsabilidad del llamador.
 */
export function clearSession(): void {
  clearAccessToken()
  // Limpiamos la caché de TanStack Query para evitar fugas de datos entre
  // cuentas o entre una sesión inválida y el próximo inicio de sesión.
  queryClient.clear()
}

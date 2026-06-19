// Hook de conveniencia que expone el store de autenticación de Zustand
// con la misma interfaz pública que tenía el Context anterior.
//
// Esto permite migrar el estado de auth a Zustand sin tocar todos los
// componentes que consumen useAuth().
import { useAuthStore } from '@/stores/auth.store'

export interface AuthContextValue {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

export function useAuth(): AuthContextValue {
  return useAuthStore()
}

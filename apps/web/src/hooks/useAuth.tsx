import { useAuthStore } from '@/stores/auth.store'

export interface AuthContextValue {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

export function useAuth(): AuthContextValue {
  return useAuthStore()
}

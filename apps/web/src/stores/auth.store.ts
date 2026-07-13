import { create } from 'zustand'
import { getAccessToken, setAccessToken } from '@/lib/auth-token'
import { clearSession } from '@/lib/session'

/**
 * Store global de autenticación con Zustand.
 *
 * ¿Por qué Zustand en lugar de Context + useState?
 * - Elimina re-renders innecesarios de todo el árbol cuando cambia el auth state.
 * - No requiere envolver la app en un Provider adicional.
 * - API más simple para estado global compartido entre componentes no relacionados.
 * - Facilita escalar a más slices de estado global en el futuro (UI, colección, etc.).
 *
 * El token sigue almacenado en sessionStorage por seguridad (ADR-004).
 * Zustand solo mantiene el estado derivado `isAuthenticated` en memoria.
 */
export interface AuthState {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  // Inicializa desde sessionStorage para que un F5 no cierre la sesión
  // dentro de la misma pestaña del navegador.
  isAuthenticated: getAccessToken() !== null,

  login: (token: string) => {
    setAccessToken(token)
    set({ isAuthenticated: true })
  },

  logout: () => {
    clearSession()
    set({ isAuthenticated: false })
  },
}))

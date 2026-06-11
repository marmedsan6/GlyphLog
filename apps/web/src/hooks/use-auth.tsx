// Co-ubicar AuthProvider y useAuth en el mismo archivo es un patrón establecido
// para contextos de React. El warning de react-refresh se suprime intencionalmente.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth-token'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicializa desde sessionStorage para que un F5 no cierre la sesión
  // dentro de la misma pestaña del navegador.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getAccessToken() !== null)

  function login(token: string): void {
    setAccessToken(token)
    setIsAuthenticated(true)
  }

  function logout(): void {
    clearAccessToken()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}

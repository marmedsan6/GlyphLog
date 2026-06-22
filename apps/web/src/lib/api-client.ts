import axios, { type AxiosError } from 'axios'
import { env } from '@/lib/env'
import { clearAccessToken, getAccessToken } from '@/lib/auth-token'

// Instancia única de Axios para toda la app.
// NUNCA usar axios directamente en componentes, hooks o servicios.
// Toda llamada HTTP pasa por este cliente.
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de request: adjunta el token de acceso si existe en sessionStorage.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor de respuesta: manejo centralizado de errores HTTP.
// Un 401 indica token expirado o inválido → limpiar sesión y redirigir.
// Excluimos las rutas de autenticación para que el error 401 llegue al
// componente y pueda mostrar el mensaje de credenciales incorrectas.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url ?? ''
      const isAuthRequest =
        requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')

      if (!isAuthRequest) {
        clearAccessToken()
        // Añadimos un query param para que LoginPage muestre un aviso claro
        // de que la sesión expiró, en lugar de un error silencioso.
        window.location.href = '/login?sessionExpired=1'
      }
    }
    return Promise.reject(error)
  }
)

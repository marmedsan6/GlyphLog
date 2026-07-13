import axios, { type AxiosError } from 'axios'
import { env } from '@/lib/env'
import { getAccessToken } from '@/lib/auth-token'
import { clearSession } from '@/lib/session'

// Instancia única de Axios para toda la app.
// NUNCA usar axios directamente en componentes, hooks o servicios.
// Toda llamada HTTP pasa por este cliente.
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Flag de protección contra redirecciones concurrentes cuando múltiples
// requests devuelven 401 a la vez (race condition). Sin esto, cada request
// 401 intentaría limpiar la sesión y cambiar window.location, causando
// parpadeos y logs duplicados en la consola.
let isRedirectingToLogin = false

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

      if (!isAuthRequest && !isRedirectingToLogin) {
        isRedirectingToLogin = true
        // Defensa en profundidad: si el servidor devuelve 401, la sesión
        // es inválida. Limpiamos el token y la caché de TanStack Query para
        // evitar que datos de una cuenta previa lleguen a la siguiente.
        clearSession()
        // Añadimos un query param para que LoginPage muestre un aviso claro
        // de que la sesión expiró, en lugar de un error silencioso.
        window.location.href = '/login?sessionExpired=1'
      }
    }
    return Promise.reject(error)
  }
)

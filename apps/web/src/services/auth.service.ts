import { apiClient } from '@/lib/api-client'
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '@/types'

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data)
  return response.data
}

export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', data)
  return response.data
}

// El backend devuelve RegisterResponse (no TokenResponse) para mantener un
// único contrato de respuesta de autenticación. Esto simplifica el manejo en
// el frontend: login y register exponen la misma forma { user, access_token }.
export async function loginWithGoogle(idToken: string): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/google', {
    id_token: idToken,
  })
  return response.data
}

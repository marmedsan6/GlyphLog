// Tipos del dominio de GlyphLog.
// Deben mantenerse en sincronía con los schemas Pydantic del backend.
// Ante cualquier cambio en la API, actualizar estos tipos primero.

export type EntryType = 'anime' | 'manga' | 'game'

export type EntryStatus =
  | 'watching'
  | 'completed'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_watch'

export interface Entry {
  id: string
  title: string
  type: EntryType
  status: EntryStatus
  rating: number | null
  year: number | null
  notes: string | null
  cover_image: string | null
  created_at: string
  updated_at: string
}

export interface EntryCreate {
  title: string
  type: EntryType
  status: EntryStatus
  rating?: number | null
  year?: number | null
  notes?: string | null
  cover_image?: File | null
}

export interface EntryResponse {
  id: string
  user_id: string
  title: string
  type: EntryType
  status: EntryStatus
  rating: number | null
  year: number | null
  notes: string | null
  cover_image: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface RegisterResponse {
  user: User
  access_token: string
  token_type: 'bearer'
}

// ── API errors ────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string
}

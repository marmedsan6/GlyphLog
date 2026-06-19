// Tipos del dominio de GlyphLog.
//
// NOTA SOBRE AUTOGENERACIÓN:
// Los tipos que provienen directamente de la API (responses y JSON bodies)
// se importan desde ./api, un archivo generado automáticamente por
// openapi-typescript a partir de /openapi.json del backend.
//
// Para regenerar los tipos:
//   pnpm --filter web generate-types
//
// Los tipos de formularios que incluyen objetos File (ej. EntryCreate)
// se mantienen manuales porque OpenAPI no representa correctamente los
// campos de tipo archivo en el cliente TypeScript.

import type { components } from './api'

// ── Tipos autogenerados desde la API ──────────────────────────────────────────

export type EntryType = components['schemas']['EntryType']
export type EntryStatus = components['schemas']['EntryStatus']

export type EntryResponse = components['schemas']['EntryResponse']

export type User = components['schemas']['UserResponse']

export type LoginRequest = components['schemas']['LoginRequest']
export type LoginResponse = components['schemas']['TokenResponse']

export type RegisterRequest = components['schemas']['UserCreate']
export type RegisterResponse = components['schemas']['RegisterResponse']

export type ApiError = {
  detail: string
}

// ── Tipos manuales (formularios con archivos u objetos no representables) ─────

export interface EntryCreate {
  title: string
  type: EntryType
  status: EntryStatus
  rating?: number | null
  year?: number | null
  notes?: string | null
  cover_image?: File | null
}

// Entry es un alias de la respuesta de la API para uso interno del frontend.
export type Entry = EntryResponse

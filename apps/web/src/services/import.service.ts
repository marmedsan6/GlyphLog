/**
 * Servicio de importación inteligente de listas con Claude.
 */

import { apiClient } from '@/lib/api-client'

export type ImportSource = 'mal' | 'anilist' | 'kitsu' | 'steam' | 'text'

export interface ParsedEntry {
  title: string
  type: 'anime' | 'manga' | 'game'
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
  rating: number | null
  current_progress: number | null
  progress_total: number | null
  year: number | null
  notes: string | null
  confidence: number
}

export interface ImportParseRequest {
  source: ImportSource
  content: string
}

export interface ImportParseResponse {
  entries: ParsedEntry[]
  warnings: string[]
}

export interface ImportExecuteRequest {
  entries: ParsedEntry[]
}

export interface ImportError {
  title: string
  error: string
}

export interface ImportExecuteResponse {
  created: number
  skipped: number
  errors: ImportError[]
}

/**
 * Parsea una lista de importación con Claude.
 */
export async function parseImport(
  request: ImportParseRequest
): Promise<ImportParseResponse> {
  const response = await apiClient.post<ImportParseResponse>('/import/parse', request)
  return response.data
}

/**
 * Ejecuta la importación de entradas parseadas.
 */
export async function executeImport(
  request: ImportExecuteRequest
): Promise<ImportExecuteResponse> {
  const response = await apiClient.post<ImportExecuteResponse>('/import/execute', request)
  return response.data
}

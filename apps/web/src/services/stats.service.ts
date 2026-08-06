/**
 * Servicio de estadísticas y métricas del usuario.
 */

import { apiClient } from '@/lib/api-client'
import type { EntryStatus, EntryType, ProgressUnit } from '@/types'

export interface UserStats {
  total_entries: number
  by_type: Record<EntryType, number>
  by_status: Record<EntryStatus, number>
  avg_rating: number
  avg_rating_by_type: Record<EntryType, number>
  completion_rate: number
  completion_rate_by_type: Record<EntryType, number>
  top_genres: Array<[string, number]>
  rating_distribution: Record<number, number>
  total_progress: Record<ProgressUnit, number>
  entries_by_month: Array<[string, number]>
  current_streak_days: number
}

/**
 * Obtiene estadísticas completas del usuario autenticado.
 */
export async function getUserStats(): Promise<UserStats> {
  const response = await apiClient.get<UserStats>('/stats/overview')
  return response.data
}

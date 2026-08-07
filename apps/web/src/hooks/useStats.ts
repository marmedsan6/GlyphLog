import { useQuery } from '@tanstack/react-query'
import { getUserStats, type UserStats } from '@/services/stats.service'

export const STATS_QUERY_KEY = 'stats' as const

export function useStats() {
  return useQuery<UserStats, Error>({
    queryKey: [STATS_QUERY_KEY],
    queryFn: getUserStats,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

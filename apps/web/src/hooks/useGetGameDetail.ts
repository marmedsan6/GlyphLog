import { useQuery } from '@tanstack/react-query'
import { getGameDetail } from '@/services/external-search.service'
import type { GameDetailResponse } from '@/types'

export const GAME_DETAIL_QUERY_KEY = 'external-game-detail' as const

interface UseGetGameDetailResult {
  data: GameDetailResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useGetGameDetail(slug: string | null): UseGetGameDetailResult {
  const query = useQuery({
    queryKey: [GAME_DETAIL_QUERY_KEY, slug],
    queryFn: () => getGameDetail(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutos de caché, igual que el backend
    retry: false,
  })

  return {
    data: query.data,
    isLoading: query.isLoading && query.fetchStatus !== 'idle',
    isError: query.isError,
    error: query.error,
  }
}

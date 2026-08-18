import { useQuery } from '@tanstack/react-query'
import { getGamePlaytime } from '@/services/external-search.service'
import type { GamePlaytimeResponse } from '@/types'

export const GAME_PLAYTIME_QUERY_KEY = 'external-game-playtime' as const

interface UseGetGamePlaytimeResult {
  data: GamePlaytimeResponse | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function useGetGamePlaytime(title: string | null): UseGetGamePlaytimeResult {
  const query = useQuery({
    queryKey: [GAME_PLAYTIME_QUERY_KEY, title],
    queryFn: () => getGamePlaytime(title!),
    enabled: !!title,
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

/**
 * Hook para analizar canales de YouTube.
 */

import { useMutation } from '@tanstack/react-query'
import { analyzeChannels } from '@/services/youtube-discovery.service'
import type { YoutubeAnalysisResponse } from '@/types/youtube-discovery'

export function useAnalyzeChannels() {
  return useMutation<YoutubeAnalysisResponse, Error, string[]>({
    mutationFn: (channelUrls: string[]) => analyzeChannels(channelUrls),
  })
}

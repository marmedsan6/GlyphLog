import { useMutation } from '@tanstack/react-query'
import {
  generateRecommendations,
  type GenerateRecommendationsRequest,
  type GenerateRecommendationsResponse,
} from '@/services/recommendation.service'

export function useGenerateRecommendations() {
  return useMutation<GenerateRecommendationsResponse, Error, GenerateRecommendationsRequest>({
    mutationFn: generateRecommendations,
  })
}

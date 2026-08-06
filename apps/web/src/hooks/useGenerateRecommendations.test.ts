import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGenerateRecommendations } from './useGenerateRecommendations'
import { generateRecommendations } from '@/services/recommendation.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { GenerateRecommendationsResponse } from '@/services/recommendation.service'

vi.mock('@/services/recommendation.service')

const mockGenerateRecommendations = vi.mocked(generateRecommendations)

function makeResponse(
  overrides: Partial<GenerateRecommendationsResponse> = {}
): GenerateRecommendationsResponse {
  return {
    recommendations: [
      {
        title: 'Attack on Titan',
        type: 'anime',
        match_percentage: 95,
        reason: 'Basado en tu amor por Fullmetal Alchemist',
        genres: ['Action', 'Dark Fantasy'],
        year: 2013,
        external_url: 'https://anilist.co/anime/16498',
        cover_image_url: 'https://example.com/cover.jpg',
        similar_to: ['Fullmetal Alchemist', 'Death Note'],
      },
    ],
    metadata: {
      analyzed_entries: 15,
      favorite_genres: ['Action', 'Fantasy', 'Sci-Fi'],
      avg_rating: 8.5,
      completion_rate: 75.0,
      tokens_used: 45000,
      model: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
    },
    ...overrides,
  }
}

describe('useGenerateRecommendations', () => {
  beforeEach(() => {
    mockGenerateRecommendations.mockReset()
  })

  it('hook inicializa con isPending=false', () => {
    const { result } = renderHook(() => useGenerateRecommendations(), {
      wrapper: TestQueryProvider,
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('mutación exitosa actualiza data y isPending', async () => {
    const mockResponse = makeResponse()
    mockGenerateRecommendations.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useGenerateRecommendations(), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync({ type: 'anime', limit: 10 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.isPending).toBe(false)
    expect(result.current.data).toEqual(mockResponse)
  })

  it('error en mutación establece error state', async () => {
    mockGenerateRecommendations.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useGenerateRecommendations(), {
      wrapper: TestQueryProvider,
    })

    act(() => {
      result.current.mutate({ type: 'anime', limit: 10 })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Network error')
    expect(result.current.data).toBeUndefined()
  })

  it('reset de mutación limpia data', async () => {
    const mockResponse = makeResponse()
    mockGenerateRecommendations.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useGenerateRecommendations(), {
      wrapper: TestQueryProvider,
    })

    await act(async () => {
      await result.current.mutateAsync({ type: 'anime', limit: 10 })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)

    act(() => {
      result.current.reset()
    })

    await waitFor(() => {
      expect(result.current.data).toBeUndefined()
    })

    expect(result.current.isError).toBe(false)
    expect(result.current.isPending).toBe(false)
  })
})

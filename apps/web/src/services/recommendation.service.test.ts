import { describe, expect, it, vi, beforeEach } from 'vitest'
import { generateRecommendations } from './recommendation.service'
import { apiClient } from '@/lib/api-client'
import type { GenerateRecommendationsResponse } from './recommendation.service'

vi.mock('@/lib/api-client')

const mockApiClient = vi.mocked(apiClient, { deep: true })

function makeResponse(): GenerateRecommendationsResponse {
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
  }
}

describe('recommendation.service', () => {
  beforeEach(() => {
    mockApiClient.post.mockReset()
  })

  it('generateRecommendations llama POST /recommendations/generate', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    const result = await generateRecommendations()

    expect(mockApiClient.post).toHaveBeenCalledWith('/recommendations/generate', {})
    expect(result).toEqual(mockResponse)
  })

  it('envía type si definido', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    await generateRecommendations({ type: 'anime' })

    expect(mockApiClient.post).toHaveBeenCalledWith('/recommendations/generate', { type: 'anime' })
  })

  it('envía limit si definido', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    await generateRecommendations({ limit: 20 })

    expect(mockApiClient.post).toHaveBeenCalledWith('/recommendations/generate', { limit: 20 })
  })

  it('maneja request vacío', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    const result = await generateRecommendations({})

    expect(mockApiClient.post).toHaveBeenCalledWith('/recommendations/generate', {})
    expect(result).toEqual(mockResponse)
  })

  it('parsea response correctamente', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    const result = await generateRecommendations({ type: 'anime', limit: 10 })

    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0].title).toBe('Attack on Titan')
    expect(result.recommendations[0].match_percentage).toBe(95)
    expect(result.metadata.analyzed_entries).toBe(15)
    expect(result.metadata.tokens_used).toBe(45000)
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnalyzeChannels } from './useAnalyzeChannels'
import { analyzeChannels } from '@/services/youtube-discovery.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { YoutubeAnalysisResponse } from '@/types/youtube-discovery'

vi.mock('@/services/youtube-discovery.service')

const mockAnalyzeChannels = vi.mocked(analyzeChannels)

function makeAnalysisResponse(): YoutubeAnalysisResponse {
  return {
    suggestions: [
      {
        title: 'Death Note',
        type: 'anime',
        mentioned_by: 'The Anime Man',
        video_title: 'Top 10 Thrillers',
        video_url: 'https://www.youtube.com/watch?v=abc123',
        opinion: 'positive',
        rating: 9,
        timestamp: '5:30',
        in_collection: false,
        external_url: null,
        cover_image_url: null,
      },
    ],
    metadata: {
      channels_analyzed: 1,
      videos_analyzed: 10,
      titles_found: 1,
      new_suggestions: 1,
      tokens_used: 45000,
      analyzed_at: '2024-01-01T00:00:00Z',
    },
  }
}

describe('useAnalyzeChannels', () => {
  beforeEach(() => {
    mockAnalyzeChannels.mockReset()
  })

  it('returns idle state initially', () => {
    const { result } = renderHook(() => useAnalyzeChannels(), {
      wrapper: TestQueryProvider,
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('analyzes channels successfully', async () => {
    const response = makeAnalysisResponse()
    mockAnalyzeChannels.mockResolvedValue(response)

    const { result } = renderHook(() => useAnalyzeChannels(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate(['https://www.youtube.com/@TheAnimeMan'])

    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual(response)
    expect(result.current.data?.suggestions).toHaveLength(1)
    expect(result.current.data?.suggestions[0].title).toBe('Death Note')
  })

  it('handles analysis error', async () => {
    const error = new Error('YouTube API error')
    mockAnalyzeChannels.mockRejectedValue(error)

    const { result } = renderHook(() => useAnalyzeChannels(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate(['https://www.youtube.com/@InvalidChannel'])

    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.isError).toBe(true)
    expect(result.current.error).toEqual(error)
  })

  it('calls analyzeChannels service with correct parameters', async () => {
    const response = makeAnalysisResponse()
    mockAnalyzeChannels.mockResolvedValue(response)

    const { result } = renderHook(() => useAnalyzeChannels(), {
      wrapper: TestQueryProvider,
    })

    const channelUrls = [
      'https://www.youtube.com/@Channel1',
      'https://www.youtube.com/@Channel2',
    ]

    result.current.mutate(channelUrls)

    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(mockAnalyzeChannels).toHaveBeenCalledWith(channelUrls)
    expect(mockAnalyzeChannels).toHaveBeenCalledTimes(1)
  })

  it('handles empty suggestions', async () => {
    const response: YoutubeAnalysisResponse = {
      suggestions: [],
      metadata: {
        channels_analyzed: 1,
        videos_analyzed: 10,
        titles_found: 0,
        new_suggestions: 0,
        tokens_used: 20000,
        analyzed_at: '2024-01-01T00:00:00Z',
      },
    }
    mockAnalyzeChannels.mockResolvedValue(response)

    const { result } = renderHook(() => useAnalyzeChannels(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate(['https://www.youtube.com/@Channel1'])

    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.suggestions).toHaveLength(0)
    expect(result.current.data?.metadata.titles_found).toBe(0)
  })

  it('handles multiple suggestions with different types', async () => {
    const response: YoutubeAnalysisResponse = {
      suggestions: [
        {
          title: 'Death Note',
          type: 'anime',
          mentioned_by: 'Channel 1',
          video_title: 'Video 1',
          video_url: 'https://www.youtube.com/watch?v=v1',
          opinion: 'positive',
          rating: 9,
          timestamp: null,
          in_collection: false,
          external_url: null,
          cover_image_url: null,
        },
        {
          title: 'Berserk',
          type: 'manga',
          mentioned_by: 'Channel 2',
          video_title: 'Video 2',
          video_url: 'https://www.youtube.com/watch?v=v2',
          opinion: 'positive',
          rating: 10,
          timestamp: null,
          in_collection: false,
          external_url: null,
          cover_image_url: null,
        },
        {
          title: 'Elden Ring',
          type: 'game',
          mentioned_by: 'Channel 3',
          video_title: 'Video 3',
          video_url: 'https://www.youtube.com/watch?v=v3',
          opinion: 'mixed',
          rating: null,
          timestamp: '12:30',
          in_collection: true,
          external_url: null,
          cover_image_url: null,
        },
      ],
      metadata: {
        channels_analyzed: 3,
        videos_analyzed: 30,
        titles_found: 3,
        new_suggestions: 2,
        tokens_used: 80000,
        analyzed_at: '2024-01-01T00:00:00Z',
      },
    }
    mockAnalyzeChannels.mockResolvedValue(response)

    const { result } = renderHook(() => useAnalyzeChannels(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate([
      'https://www.youtube.com/@Channel1',
      'https://www.youtube.com/@Channel2',
      'https://www.youtube.com/@Channel3',
    ])

    await waitFor(() => expect(result.current.isPending).toBe(false))

    expect(result.current.data?.suggestions).toHaveLength(3)

    const types = result.current.data?.suggestions.map((s) => s.type)
    expect(types).toContain('anime')
    expect(types).toContain('manga')
    expect(types).toContain('game')

    const inCollection = result.current.data?.suggestions.filter((s) => s.in_collection)
    expect(inCollection).toHaveLength(1)

    const newSuggestions = result.current.data?.suggestions.filter((s) => !s.in_collection)
    expect(newSuggestions).toHaveLength(2)
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { generateChatYoutubeDiscovery } from './youtube-discovery.service'
import { apiClient } from '@/lib/api-client'
import type { GenerateChatYoutubeResponse } from './youtube-discovery.service'

vi.mock('@/lib/api-client')

const mockApiClient = vi.mocked(apiClient, { deep: true })

function makeResponse(): GenerateChatYoutubeResponse {
  return {
    conversation_id: 'conv-1',
    suggestions: [
      {
        title: 'Death Note',
        type: 'anime',
        mentioned_by: 'The Anime Man',
        video_title: 'Top 10 Psychological Thrillers',
        video_url: 'https://www.youtube.com/watch?v=abc123',
        opinion: 'positive',
        rating: 9,
        timestamp: '3:42',
        in_collection: false,
        external_url: null,
        cover_image_url: null,
      },
    ],
    metadata: {
      channels_analyzed: 1,
      videos_analyzed: 20,
      titles_found: 1,
      new_suggestions: 1,
      tokens_used: 0,
      analyzed_at: '2026-08-15T12:00:00Z',
    },
  }
}

describe('youtube-discovery.service', () => {
  beforeEach(() => {
    mockApiClient.post.mockReset()
  })

  it('generateChatYoutubeDiscovery llama POST /ai/youtube', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    const urls = ['https://www.youtube.com/@TheAnimeMan']
    const result = await generateChatYoutubeDiscovery(urls)

    expect(mockApiClient.post).toHaveBeenCalledWith('/ai/youtube', {
      channel_urls: urls,
      conversation_id: null,
    })
    expect(result).toEqual(mockResponse)
  })

  it('envía conversation_id cuando existe', async () => {
    const mockResponse = makeResponse()
    mockApiClient.post.mockResolvedValue({ data: mockResponse })

    await generateChatYoutubeDiscovery(
      ['https://www.youtube.com/@TheAnimeMan'],
      'conv-1'
    )

    expect(mockApiClient.post).toHaveBeenCalledWith('/ai/youtube', {
      channel_urls: ['https://www.youtube.com/@TheAnimeMan'],
      conversation_id: 'conv-1',
    })
  })
})

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { uploadCoverImage, updateEntry, updateProgress } from './entry.service'
import { apiClient } from '@/lib/api-client'
import type { EntryResponse, EntryUpdateFormData } from '@/types'

vi.mock('@/lib/api-client')

const mockPost = vi.mocked(apiClient.post)
const mockPut = vi.mocked(apiClient.put)

function makeEntry(overrides: Partial<EntryResponse> = {}): EntryResponse {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: 9.5,
    year: 1999,
    notes: 'Notas',
    cover_image: null,
    progress_unit: null,
    progress_total: null,
    current_progress: null,
    has_history: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ...overrides,
  }
}

function makeFormData(overrides: Partial<EntryUpdateFormData> = {}): EntryUpdateFormData {
  return {
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: '9.5',
    year: '1999',
    notes: 'Notas',
    progress_total: '12',
    ...overrides,
  }
}

describe('uploadCoverImage', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('sends a multipart POST to /entries/{id}/cover', async () => {
    const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' })
    const response = makeEntry({ cover_image: '/uploads/covers/new.png' })
    mockPost.mockResolvedValue({ data: response })

    const result = await uploadCoverImage('entry-1', file)

    expect(mockPost).toHaveBeenCalledWith('/entries/entry-1/cover', expect.any(FormData), {
      headers: { 'Content-Type': undefined },
    })
    expect(result).toEqual(response)
  })
})

describe('updateEntry', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPut.mockReset()
  })

  it('uploads a new cover image first when cover_image is a File', async () => {
    const file = new File(['image-bytes'], 'cover.png', { type: 'image/png' })
    const uploadResponse = makeEntry({ cover_image: '/uploads/covers/new.png' })
    const updateResponse = makeEntry({ title: 'Updated' })

    mockPost.mockResolvedValue({ data: uploadResponse })
    mockPut.mockResolvedValue({ data: updateResponse })

    const result = await updateEntry('entry-1', makeFormData({ cover_image: file }))

    expect(mockPost).toHaveBeenCalledWith('/entries/entry-1/cover', expect.any(FormData), {
      headers: { 'Content-Type': undefined },
    })

    expect(mockPut).toHaveBeenCalledWith('/entries/entry-1', {
      title: 'One Piece',
      type: 'anime',
      status: 'watching',
      rating: 9.5,
      year: 1999,
      notes: 'Notas',
      progress_total: 12,
      cover_image: '/uploads/covers/new.png',
    })

    expect(result).toEqual(updateResponse)
  })

  it('sends cover_image null when cover_image is null', async () => {
    const updateResponse = makeEntry({ cover_image: null })
    mockPut.mockResolvedValue({ data: updateResponse })

    await updateEntry('entry-1', makeFormData({ cover_image: null }))

    expect(mockPost).not.toHaveBeenCalled()
    expect(mockPut).toHaveBeenCalledWith(
      '/entries/entry-1',
      expect.objectContaining({ cover_image: null })
    )
  })

  it('omits cover_image from PUT body when cover_image is undefined', async () => {
    const updateResponse = makeEntry()
    mockPut.mockResolvedValue({ data: updateResponse })

    await updateEntry('entry-1', makeFormData({ cover_image: undefined }))

    expect(mockPost).not.toHaveBeenCalled()

    const [, body] = mockPut.mock.calls[0]
    expect(body).not.toHaveProperty('cover_image')
  })
})

describe('updateProgress', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('sends a POST request to /entries/{id}/progress with data', async () => {
    const response = makeEntry({ current_progress: 5 })
    mockPost.mockResolvedValue({ data: response })

    const result = await updateProgress('entry-1', {
      new_value: 5,
      note: 'Avanzando un poco',
      mark_completed: false,
    })

    expect(mockPost).toHaveBeenCalledWith('/entries/entry-1/progress', {
      new_value: 5,
      note: 'Avanzando un poco',
      mark_completed: false,
    })
    expect(result).toEqual(response)
  })
})


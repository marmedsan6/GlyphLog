import { apiClient } from '@/lib/api-client'
import type { EntryCreate, EntryResponse } from '@/types'

export async function createEntry(data: EntryCreate): Promise<EntryResponse> {
  const formData = new FormData()
  formData.append('title', data.title)
  formData.append('type', data.type)
  formData.append('status', data.status)

  if (data.rating != null) {
    formData.append('rating', String(data.rating))
  }
  if (data.year != null) {
    formData.append('year', String(data.year))
  }
  if (data.notes != null && data.notes !== '') {
    formData.append('notes', data.notes)
  }
  if (data.cover_image != null) {
    formData.append('cover_image', data.cover_image)
  }

  // FormData necesita que NO se envíe Content-Type header,
  // para que el browser lo configure automáticamente con el boundary correcto.
  const response = await apiClient.post<EntryResponse>('/entries', formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data
}

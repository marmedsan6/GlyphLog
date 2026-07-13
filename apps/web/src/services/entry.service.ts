import { apiClient } from '@/lib/api-client'
import type {
  EntryCreate,
  EntryResponse,
  EntryUpdateFormData,
  PaginatedEntryResponse,
} from '@/types'
import type { components, paths } from '@/types/api'

export type GetEntriesParams = NonNullable<
  paths['/api/v1/entries/']['get']['parameters']['query']
>

export async function getEntries(
  params?: GetEntriesParams
): Promise<PaginatedEntryResponse> {
  const response = await apiClient.get<PaginatedEntryResponse>('/entries/', {
    params,
  })
  return response.data
}

export async function getEntry(id: string): Promise<EntryResponse> {
  const response = await apiClient.get<EntryResponse>(`/entries/${id}`)
  return response.data
}

export async function uploadCoverImage(
  id: string,
  file: File
): Promise<EntryResponse> {
  const formData = new FormData()
  formData.append('cover_image', file)

  const response = await apiClient.post<EntryResponse>(
    `/entries/${id}/cover`,
    formData,
    {
      headers: { 'Content-Type': undefined },
    }
  )
  return response.data
}

export async function updateEntry(
  id: string,
  data: EntryUpdateFormData
): Promise<EntryResponse> {
  let coverImagePath: string | null | undefined

  if (data.cover_image instanceof File) {
    const uploadResponse = await uploadCoverImage(id, data.cover_image)
    coverImagePath = uploadResponse.cover_image
  } else {
    // null -> enviar null para eliminar la imagen.
    // undefined -> no se envía el campo (conservar imagen actual).
    coverImagePath = data.cover_image
  }

  const body: components['schemas']['EntryUpdate'] = {
    title: data.title.trim(),
    type: data.type,
    status: data.status,
    rating: data.rating ? parseFloat(data.rating) : null,
    year: data.year ? parseInt(data.year, 10) : null,
    notes: data.notes?.trim() || null,
  }

  if (coverImagePath !== undefined) {
    body.cover_image = coverImagePath
  }

  const response = await apiClient.put<EntryResponse>(`/entries/${id}`, body)
  return response.data
}

export async function deleteEntry(id: string): Promise<void> {
  await apiClient.delete(`/entries/${id}`)
}

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
    if (data.cover_image instanceof File) {
      formData.append('cover_image', data.cover_image)
    } else if (typeof data.cover_image === 'string') {
      formData.append('cover_image_url', data.cover_image)
    }
  }

  // FormData necesita que NO se envíe Content-Type header,
  // para que el browser lo configure automáticamente con el boundary correcto.
  const response = await apiClient.post<EntryResponse>('/entries', formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data
}

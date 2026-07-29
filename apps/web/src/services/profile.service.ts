import { apiClient } from '@/lib/api-client'
import type { AvatarUploadResponse, UserProfileResponse, UserProfileUpdate } from '@/types'

export async function getProfile(): Promise<UserProfileResponse> {
  const response = await apiClient.get<UserProfileResponse>('/users/me')
  return response.data
}

export async function updateProfile(data: UserProfileUpdate): Promise<UserProfileResponse> {
  const response = await apiClient.patch<UserProfileResponse>('/users/me', data)
  return response.data
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await apiClient.post<AvatarUploadResponse>('/users/me/avatar', formData, {
    headers: { 'Content-Type': undefined },
  })
  return response.data
}

export async function deleteAvatar(): Promise<UserProfileResponse> {
  const response = await apiClient.delete<UserProfileResponse>('/users/me/avatar')
  return response.data
}

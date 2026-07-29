import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteAvatar, getProfile, updateProfile, uploadAvatar } from '@/services/profile.service'
import type { AvatarUploadResponse, UserProfileResponse, UserProfileUpdate } from '@/types'

export const PROFILE_QUERY_KEY = 'profile'

export function useProfile() {
  return useQuery<UserProfileResponse, Error>({
    queryKey: [PROFILE_QUERY_KEY],
    queryFn: getProfile,
    staleTime: 60_000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation<UserProfileResponse, Error, UserProfileUpdate>({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] })
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation<AvatarUploadResponse, Error, File>({
    mutationFn: uploadAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] })
    },
  })
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient()

  return useMutation<UserProfileResponse, Error>({
    mutationFn: deleteAvatar,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY] })
    },
  })
}

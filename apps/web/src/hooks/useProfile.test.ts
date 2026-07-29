import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from './useProfile'
import { deleteAvatar, getProfile, updateProfile, uploadAvatar } from '@/services/profile.service'
import { TestQueryProvider } from '@/test/query-client-provider'
import type { UserProfileResponse } from '@/types'

vi.mock('@/services/profile.service')

const mockGetProfile = vi.mocked(getProfile)
const mockUpdateProfile = vi.mocked(updateProfile)
const mockUploadAvatar = vi.mocked(uploadAvatar)
const mockDeleteAvatar = vi.mocked(deleteAvatar)

function makeProfile(overrides: Partial<UserProfileResponse> = {}): UserProfileResponse {
  return {
    id: 'user-1',
    email: 'test@example.com',
    username: 'gamer',
    avatar_url: 'https://api.dicebear.com/9.x/pixel-art/svg?seed=user-1',
    bio: 'Me gustan los JRPG',
    ...overrides,
  }
}

describe('useProfile', () => {
  beforeEach(() => {
    mockGetProfile.mockReset()
  })

  it('returns loading state initially', () => {
    mockGetProfile.mockResolvedValue(makeProfile())

    const { result } = renderHook(() => useProfile(), {
      wrapper: TestQueryProvider,
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('returns profile data on success', async () => {
    const profile = makeProfile()
    mockGetProfile.mockResolvedValue(profile)

    const { result } = renderHook(() => useProfile(), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual(profile)
    expect(result.current.isError).toBe(false)
    expect(mockGetProfile).toHaveBeenCalled()
  })

  it('exposes error state when the service fails', async () => {
    mockGetProfile.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useProfile(), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useUpdateProfile', () => {
  beforeEach(() => {
    mockUpdateProfile.mockReset()
  })

  it('calls updateProfile service and invalidates profile query', async () => {
    const updated = makeProfile({ username: 'newname', bio: 'Updated bio' })
    mockUpdateProfile.mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate({ username: 'newname', bio: 'Updated bio' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      { username: 'newname', bio: 'Updated bio' },
      expect.anything()
    )
  })
})

describe('useUploadAvatar', () => {
  beforeEach(() => {
    mockUploadAvatar.mockReset()
  })

  it('calls uploadAvatar service with file', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    mockUploadAvatar.mockResolvedValue({ avatar_url: '/uploads/avatars/user-1.webp' })

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate(file)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockUploadAvatar).toHaveBeenCalledWith(file, expect.anything())
  })
})

describe('useDeleteAvatar', () => {
  beforeEach(() => {
    mockDeleteAvatar.mockReset()
  })

  it('calls deleteAvatar service', async () => {
    mockDeleteAvatar.mockResolvedValue(makeProfile({ avatar_url: 'https://dicebear.com/...' }))

    const { result } = renderHook(() => useDeleteAvatar(), {
      wrapper: TestQueryProvider,
    })

    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockDeleteAvatar).toHaveBeenCalledWith(undefined, expect.anything())
  })
})

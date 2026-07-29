import { describe, expect, it, vi } from 'vitest'
import { getAvatarUrl } from './avatar-url'

vi.mock('@/lib/env', () => ({
  env: {
    apiBaseUrl: 'http://localhost:8000',
  },
}))

describe('getAvatarUrl', () => {
  it('returns empty string for null', () => {
    expect(getAvatarUrl(null)).toBe('')
  })

  it('returns absolute URLs as-is', () => {
    expect(getAvatarUrl('https://api.dicebear.com/9.x/pixel-art/svg?seed=1')).toBe(
      'https://api.dicebear.com/9.x/pixel-art/svg?seed=1'
    )
  })

  it('prepends base URL for relative paths', () => {
    expect(getAvatarUrl('/uploads/avatars/user-1.webp')).toBe(
      'http://localhost:8000/uploads/avatars/user-1.webp'
    )
  })

  it('adds leading slash if missing', () => {
    expect(getAvatarUrl('uploads/avatars/user-1.webp')).toBe(
      'http://localhost:8000/uploads/avatars/user-1.webp'
    )
  })
})

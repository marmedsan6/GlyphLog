import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from './auth.store'
import { clearAccessToken, setAccessToken } from '@/lib/auth-token'
import { queryClient } from '@/lib/query-client'

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    clear: vi.fn(),
  },
}))

describe('useAuthStore', () => {
  beforeEach(() => {
    clearAccessToken()
    useAuthStore.setState({ isAuthenticated: false })
    vi.mocked(queryClient.clear).mockClear()
  })

  it('should initialize as not authenticated when no token exists', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should authenticate when login is called', () => {
    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.login('fake-jwt-token')
    })

    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should clear authentication when logout is called', () => {
    setAccessToken('fake-jwt-token')
    useAuthStore.setState({ isAuthenticated: true })

    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should clear TanStack Query cache when logout is called', () => {
    setAccessToken('fake-jwt-token')
    useAuthStore.setState({ isAuthenticated: true })

    const { result } = renderHook(() => useAuthStore())

    act(() => {
      result.current.logout()
    })

    expect(queryClient.clear).toHaveBeenCalledTimes(1)
  })
})

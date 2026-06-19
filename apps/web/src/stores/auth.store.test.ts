import { describe, expect, it, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from './auth.store'
import { clearAccessToken, setAccessToken } from '@/lib/auth-token'

describe('useAuthStore', () => {
  beforeEach(() => {
    clearAccessToken()
    useAuthStore.setState({ isAuthenticated: false })
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
})

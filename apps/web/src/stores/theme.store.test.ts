import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useThemeStore } from './theme.store'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useThemeStore.setState({ theme: 'light' })
  })

  it('should initialize as light when no preference is stored', () => {
    const { result } = renderHook(() => useThemeStore())
    expect(result.current.theme).toBe('light')
  })

  it('should initialize as dark when localStorage has dark preference', () => {
    localStorageMock.setItem('glyphlog-theme', 'dark')
    useThemeStore.setState({ theme: 'dark' })

    const { result } = renderHook(() => useThemeStore())
    expect(result.current.theme).toBe('dark')
  })

  it('should set theme and persist to localStorage', () => {
    const { result } = renderHook(() => useThemeStore())

    act(() => {
      result.current.setTheme('dark')
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('glyphlog-theme', 'dark')
  })

  it('should toggle theme between light and dark', () => {
    const { result } = renderHook(() => useThemeStore())

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('glyphlog-theme', 'dark')

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('glyphlog-theme', 'light')
  })

  it('should toggle from dark to light on second call', () => {
    localStorageMock.setItem('glyphlog-theme', 'dark')
    useThemeStore.setState({ theme: 'dark' })

    const { result } = renderHook(() => useThemeStore())

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('light')
  })
})

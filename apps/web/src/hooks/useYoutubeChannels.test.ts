import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useYoutubeChannels } from './useYoutubeChannels'

describe('useYoutubeChannels', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('starts with empty channels', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    expect(result.current.channels).toEqual([])
    expect(result.current.canAddMore).toBe(true)
  })

  it('adds a channel successfully', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    act(() => {
      result.current.addChannel('https://www.youtube.com/@TheAnimeMan')
    })

    expect(result.current.channels).toHaveLength(1)
    expect(result.current.channels[0]).toBe('https://www.youtube.com/@TheAnimeMan')
  })

  it('persists channels in localStorage', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel1')
    })

    // Verificar que se guardó en localStorage
    const stored = localStorage.getItem('glyphlog_youtube_channels')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toBe('https://www.youtube.com/@Channel1')
  })

  it('loads channels from localStorage on mount', () => {
    // Pre-cargar en localStorage
    const channels = [
      'https://www.youtube.com/@Channel1',
      'https://www.youtube.com/@Channel2',
    ]
    localStorage.setItem('glyphlog_youtube_channels', JSON.stringify(channels))

    const { result } = renderHook(() => useYoutubeChannels())

    // Esperar a que se carguen del localStorage (efecto useEffect)
    expect(result.current.channels).toHaveLength(2)
    expect(result.current.channels).toEqual(channels)
  })

  it('removes a channel', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel1')
      result.current.addChannel('https://www.youtube.com/@Channel2')
    })

    expect(result.current.channels).toHaveLength(2)

    act(() => {
      result.current.removeChannel('https://www.youtube.com/@Channel1')
    })

    expect(result.current.channels).toHaveLength(1)
    expect(result.current.channels[0]).toBe('https://www.youtube.com/@Channel2')
  })

  it('clears all channels', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel1')
      result.current.addChannel('https://www.youtube.com/@Channel2')
    })

    expect(result.current.channels).toHaveLength(2)

    act(() => {
      result.current.clearChannels()
    })

    expect(result.current.channels).toHaveLength(0)
  })

  it('throws error when adding more than max channels', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    // Añadir 5 canales (máximo)
    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel1')
      result.current.addChannel('https://www.youtube.com/@Channel2')
      result.current.addChannel('https://www.youtube.com/@Channel3')
      result.current.addChannel('https://www.youtube.com/@Channel4')
      result.current.addChannel('https://www.youtube.com/@Channel5')
    })

    expect(result.current.channels).toHaveLength(5)
    expect(result.current.canAddMore).toBe(false)

    // Intentar añadir un sexto
    expect(() => {
      act(() => {
        result.current.addChannel('https://www.youtube.com/@Channel6')
      })
    }).toThrow('Máximo 5 canales permitidos')

    expect(result.current.channels).toHaveLength(5)
  })

  it('throws error when adding duplicate channel', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel1')
    })

    expect(() => {
      act(() => {
        result.current.addChannel('https://www.youtube.com/@Channel1')
      })
    }).toThrow('Este canal ya está en la lista')

    expect(result.current.channels).toHaveLength(1)
  })

  it('updates canAddMore when approaching limit', () => {
    const { result } = renderHook(() => useYoutubeChannels())

    expect(result.current.canAddMore).toBe(true)

    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel1')
      result.current.addChannel('https://www.youtube.com/@Channel2')
      result.current.addChannel('https://www.youtube.com/@Channel3')
      result.current.addChannel('https://www.youtube.com/@Channel4')
    })

    expect(result.current.canAddMore).toBe(true)

    act(() => {
      result.current.addChannel('https://www.youtube.com/@Channel5')
    })

    expect(result.current.canAddMore).toBe(false)
  })
})

/**
 * Hook para gestionar canales de YouTube guardados.
 *
 * Usa localStorage para persistir la lista de canales.
 */

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'glyphlog_youtube_channels'
const MAX_CHANNELS = 5

function loadChannels(): string[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []

  try {
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.every((channel): channel is string => typeof channel === 'string')
      ? parsed
      : []
  } catch {
    return []
  }
}

export function useYoutubeChannels() {
  const [channels, setChannels] = useState<string[]>(loadChannels)
  const channelsRef = useRef(channels)

  useEffect(() => {
    channelsRef.current = channels
  }, [channels])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
  }, [channels])

  const addChannel = (url: string) => {
    const current = channelsRef.current
    if (current.length >= MAX_CHANNELS) {
      throw new Error(`Máximo ${MAX_CHANNELS} canales permitidos`)
    }
    if (current.includes(url)) {
      throw new Error('Este canal ya está en la lista')
    }
    const next = [...current, url]
    channelsRef.current = next
    setChannels(next)
  }

  const removeChannel = (url: string) => {
    const next = channelsRef.current.filter((channel) => channel !== url)
    channelsRef.current = next
    setChannels(next)
  }

  const clearChannels = () => {
    channelsRef.current = []
    setChannels([])
  }

  return {
    channels,
    addChannel,
    removeChannel,
    clearChannels,
    maxChannels: MAX_CHANNELS,
    canAddMore: channels.length < MAX_CHANNELS,
  }
}

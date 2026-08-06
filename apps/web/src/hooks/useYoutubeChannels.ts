/**
 * Hook para gestionar canales de YouTube guardados.
 *
 * Usa localStorage para persistir la lista de canales.
 */

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'glyphlog_youtube_channels'
const MAX_CHANNELS = 5

export function useYoutubeChannels() {
  const [channels, setChannels] = useState<string[]>([])

  // Cargar canales del localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setChannels(parsed)
        }
      } catch (error) {
        console.error('Error al cargar canales:', error)
      }
    }
  }, [])

  // Guardar canales en localStorage cuando cambian
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels))
  }, [channels])

  const addChannel = (url: string) => {
    if (channels.length >= MAX_CHANNELS) {
      throw new Error(`Máximo ${MAX_CHANNELS} canales permitidos`)
    }

    if (channels.includes(url)) {
      throw new Error('Este canal ya está en la lista')
    }

    setChannels([...channels, url])
  }

  const removeChannel = (url: string) => {
    setChannels(channels.filter((ch) => ch !== url))
  }

  const clearChannels = () => {
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

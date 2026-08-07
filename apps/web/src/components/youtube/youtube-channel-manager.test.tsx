import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { YoutubeChannelManager } from './youtube-channel-manager'

describe('YoutubeChannelManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders empty state initially', () => {
    render(<YoutubeChannelManager />)

    expect(screen.getByText(/No has añadido ningún canal todavía/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/URL del canal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Añadir/i })).toBeInTheDocument()
  })

  it('adds a channel when valid URL is entered', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/@TheAnimeMan' },
    })
    fireEvent.click(addButton)

    expect(screen.getByText(/TheAnimeMan/i)).toBeInTheDocument()
    expect(screen.getByText(/Canales guardados \(1\/5\)/i)).toBeInTheDocument()
  })

  it('shows error when adding empty URL', () => {
    render(<YoutubeChannelManager />)

    const addButton = screen.getByRole('button', { name: /Añadir/i })
    fireEvent.click(addButton)

    expect(screen.getByText(/Ingresa una URL de canal/i)).toBeInTheDocument()
  })

  it('shows error when adding invalid URL', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    fireEvent.change(input, { target: { value: 'https://invalid-url.com' } })
    fireEvent.click(addButton)

    expect(screen.getByText(/Ingresa una URL válida de YouTube/i)).toBeInTheDocument()
  })

  it('removes a channel when delete button is clicked', () => {
    render(<YoutubeChannelManager />)

    // Añadir canal
    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/@TheAnimeMan' },
    })
    fireEvent.click(addButton)

    expect(screen.getByText(/TheAnimeMan/i)).toBeInTheDocument()

    // Eliminar canal
    const deleteButton = screen.getByRole('button', { name: /Eliminar canal/i })
    fireEvent.click(deleteButton)

    expect(screen.queryByText(/TheAnimeMan/i)).not.toBeInTheDocument()
    expect(screen.getByText(/No has añadido ningún canal todavía/i)).toBeInTheDocument()
  })

  it('disables add button when max channels reached', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    // Añadir 5 canales
    for (let i = 1; i <= 5; i++) {
      fireEvent.change(input, {
        target: { value: `https://www.youtube.com/@Channel${i}` },
      })
      fireEvent.click(addButton)
    }

    expect(screen.getByText(/Canales guardados \(5\/5\)/i)).toBeInTheDocument()
    expect(addButton).toBeDisabled()
    expect(input).toBeDisabled()
    expect(screen.getByText(/Máximo de 5 canales alcanzado/i)).toBeInTheDocument()
  })

  it('adds channel on Enter key press', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement

    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/@TheAnimeMan' },
    })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(screen.getByText(/TheAnimeMan/i)).toBeInTheDocument()
  })

  it('clears input after successfully adding channel', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/@TheAnimeMan' },
    })
    fireEvent.click(addButton)

    expect(input.value).toBe('')
  })

  it('shows error when adding duplicate channel', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    const channelUrl = 'https://www.youtube.com/@TheAnimeMan'

    // Añadir primera vez
    fireEvent.change(input, { target: { value: channelUrl } })
    fireEvent.click(addButton)

    // Intentar añadir duplicado
    fireEvent.change(input, { target: { value: channelUrl } })
    fireEvent.click(addButton)

    expect(screen.getByText(/Este canal ya está en la lista/i)).toBeInTheDocument()
  })

  it('displays correct count of channels', () => {
    render(<YoutubeChannelManager />)

    const input = screen.getByLabelText(/URL del canal/i) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /Añadir/i })

    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/@Channel1' },
    })
    fireEvent.click(addButton)

    expect(screen.getByText(/Canales guardados \(1\/5\)/i)).toBeInTheDocument()

    fireEvent.change(input, {
      target: { value: 'https://www.youtube.com/@Channel2' },
    })
    fireEvent.click(addButton)

    expect(screen.getByText(/Canales guardados \(2\/5\)/i)).toBeInTheDocument()
  })
})

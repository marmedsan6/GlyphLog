import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChatWidget } from './chat-widget'
import { streamChat } from '@/services/ai.service'

vi.mock('@/services/ai.service', () => ({
  streamChat: vi.fn(),
}))

const mockStreamChat = vi.mocked(streamChat)

describe('ChatWidget', () => {
  beforeEach(() => {
    mockStreamChat.mockReset()
  })

  it('está cerrado por defecto y abre el panel al hacer clic', () => {
    render(<ChatWidget />)

    expect(screen.queryByText('GlyphAI')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat GlyphAI' }))

    expect(screen.getByText('GlyphAI')).toBeDefined()
    expect(screen.getByLabelText('Mensaje para GlyphAI')).toBeDefined()
  })

  it('muestra la conversación con streaming al enviar un mensaje', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'delta', delta: 'Te recomiendo ' }
      yield { type: 'delta', delta: 'Frieren' }
      yield { type: 'done' }
    })

    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat GlyphAI' }))

    const input = screen.getByLabelText('Mensaje para GlyphAI')
    fireEvent.change(input, { target: { value: '¿Qué anime me recomiendas?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    await waitFor(() => {
      expect(screen.getByText('¿Qué anime me recomiendas?')).toBeDefined()
    })
    await waitFor(() => {
      expect(screen.getByText('Te recomiendo Frieren')).toBeDefined()
    })
  })

  it('muestra el error inline si el servicio falla', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'error', message: 'AI service not configured' }
    })

    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat GlyphAI' }))

    const input = screen.getByLabelText('Mensaje para GlyphAI')
    fireEvent.change(input, { target: { value: 'hola' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensaje' }))

    await waitFor(() => {
      expect(screen.getByText('AI service not configured')).toBeDefined()
    })
  })

  it('no envía mensajes vacíos', async () => {
    render(<ChatWidget />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir chat GlyphAI' }))

    const sendButton = screen.getByRole('button', { name: 'Enviar mensaje' })
    expect((sendButton as HTMLButtonElement).disabled).toBe(true)
    expect(mockStreamChat).not.toHaveBeenCalled()
  })
})

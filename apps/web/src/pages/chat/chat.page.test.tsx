import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChatPage } from './chat.page'
import {
  deleteConversation,
  getConversation,
  getConversations,
  streamChat,
} from '@/services/ai.service'
import { TestQueryProvider } from '@/test/query-client-provider'

vi.mock('@/services/ai.service')

const mockStreamChat = vi.mocked(streamChat)
const mockGetConversations = vi.mocked(getConversations)
const mockGetConversation = vi.mocked(getConversation)
const mockDeleteConversation = vi.mocked(deleteConversation)

function makeConversations() {
  return {
    conversations: [
      {
        id: 'conv-1',
        title: 'Recomendaciones de anime',
        created_at: '2026-08-01T10:00:00Z',
        updated_at: '2026-08-06T10:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 15,
    total_pages: 1,
  }
}

function makeDetail() {
  return {
    id: 'conv-1',
    title: 'Recomendaciones de anime',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-06T10:00:00Z',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: '¿Qué anime me recomiendas?',
        created_at: '2026-08-06T10:00:00Z',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Te recomiendo Frieren',
        created_at: '2026-08-06T10:00:01Z',
      },
    ],
  }
}

function renderPage() {
  return render(
    <TestQueryProvider>
      <ChatPage />
    </TestQueryProvider>
  )
}

describe('ChatPage', () => {
  beforeEach(() => {
    mockStreamChat.mockReset()
    mockGetConversations.mockReset()
    mockGetConversation.mockReset()
    mockDeleteConversation.mockReset()
    mockGetConversations.mockResolvedValue(makeConversations() as never)
  })

  it('muestra la pantalla de bienvenida con sugerencias sin conversación activa', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByText('Habla con GlyphAI')).toBeDefined())
    expect(screen.getByText('¿Qué anime me recomiendas según mi colección?')).toBeDefined()
  })

  it('una sugerencia inicia el chat y muestra la respuesta en streaming', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'delta', delta: 'Te recomiendo Frieren' }
      yield { type: 'done' }
    })

    renderPage()

    fireEvent.click(
      await screen.findByText('¿Qué anime me recomiendas según mi colección?')
    )

    await waitFor(() => {
      expect(screen.getByText('Te recomiendo Frieren')).toBeDefined()
    })
    expect(mockStreamChat).toHaveBeenCalledTimes(1)
  })

  it('la sidebar lista conversaciones y al seleccionar carga su historial', async () => {
    mockGetConversation.mockResolvedValue(makeDetail() as never)

    renderPage()

    fireEvent.click(await screen.findByText('Recomendaciones de anime'))

    await waitFor(() => {
      expect(screen.getByText('¿Qué anime me recomiendas?')).toBeDefined()
    })
    expect(screen.getByText('Te recomiendo Frieren')).toBeDefined()
    expect(mockGetConversation).toHaveBeenCalledWith('conv-1')
  })

  it('borrar una conversación pide confirmación y la elimina', async () => {
    mockDeleteConversation.mockResolvedValue(undefined)
    renderPage()

    fireEvent.click(await screen.findByText('Recomendaciones de anime'))
    fireEvent.click(
      await screen.findByLabelText('Eliminar conversación Recomendaciones de anime')
    )

    // Diálogo de confirmación visible.
    expect(screen.getByText('¿Eliminar esta conversación?')).toBeDefined()
    fireEvent.click(screen.getByText('Eliminar'))

    await waitFor(() => expect(mockDeleteConversation).toHaveBeenCalledWith('conv-1'))
  })

  it('muestra error inline si el stream falla', async () => {
    mockStreamChat.mockImplementation(async function* () {
      yield { type: 'error', message: 'AI service not configured' }
    })

    renderPage()

    fireEvent.click(
      await screen.findByText('¿Qué anime me recomiendas según mi colección?')
    )

    await waitFor(() => {
      expect(screen.getByText('AI service not configured')).toBeDefined()
    })
  })
})

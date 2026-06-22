import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { EntryDetailPage } from './entry-detail.page'
import * as entryService from '@/services/entry.service'
import { createTestQueryClient } from '@/test/create-test-query-client'
import { Toaster } from '@/components/ui/toaster'
import type { EntryResponse } from '@/types'

vi.mock('@/services/entry.service')

vi.mock('@/lib/env', () => ({
  env: {
    apiUrl: 'http://localhost:8000/api/v1',
    apiBaseUrl: 'http://localhost:8000',
  },
}))

const mockGetEntry = vi.mocked(entryService.getEntry)
const mockUpdateEntry = vi.mocked(entryService.updateEntry)
const mockDeleteEntry = vi.mocked(entryService.deleteEntry)

function makeEntry(overrides: Partial<EntryResponse> = {}): EntryResponse {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    title: 'One Piece',
    type: 'anime',
    status: 'watching',
    rating: 9.5,
    year: 1999,
    notes: 'Notas de prueba',
    cover_image: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ...overrides,
  }
}

function renderPage(
  initialEntry = '/entries/entry-1',
  entryOverrides?: Partial<EntryResponse>
) {
  const queryClient = createTestQueryClient()

  if (entryOverrides) {
    mockGetEntry.mockResolvedValue(makeEntry(entryOverrides))
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/entries/:id" element={<EntryDetailPage />} />
          <Route path="/collection" element={<div data-testid="collection-page">Colección</div>} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('EntryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetEntry.mockResolvedValue(makeEntry())
  })

  it('renders entry details in read mode', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })

    expect(screen.getByText('Anime · Viendo')).toBeInTheDocument()
    expect(screen.getByText('9.5')).toBeInTheDocument()
    expect(screen.getByText('1999')).toBeInTheDocument()
    expect(screen.getByText('Notas de prueba')).toBeInTheDocument()
    expect(screen.getByTestId('edit-button')).toBeInTheDocument()
    expect(screen.getByTestId('delete-button')).toBeInTheDocument()
  })

  it('switches to edit mode when clicking edit button', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })

    act(() => {
      screen.getByTestId('edit-button').click()
    })

    await waitFor(() => {
      expect(screen.getByText('Editar entrada')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Título')).toHaveValue('One Piece')
    expect(screen.getByLabelText(/Puntuación/)).toHaveValue(9.5)
    expect(screen.getByLabelText('Año')).toHaveValue(1999)
  })

  it('returns to read mode when clicking cancel', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })

    act(() => {
      screen.getByTestId('edit-button').click()
    })

    await waitFor(() => {
      expect(screen.getByText('Editar entrada')).toBeInTheDocument()
    })

    act(() => {
      screen.getByRole('button', { name: 'Cancelar' }).click()
    })

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })
  })

  it('submits updated values and shows success toast', async () => {
    mockUpdateEntry.mockResolvedValue(makeEntry({ title: 'One Piece updated' }))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })

    act(() => {
      screen.getByTestId('edit-button').click()
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Título')).toBeInTheDocument()
    })

    const titleInput = screen.getByLabelText('Título')
    fireEvent.change(titleInput, { target: { value: 'One Piece updated' } })

    act(() => {
      screen.getByRole('button', { name: 'Guardar cambios' }).click()
    })

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalled()
    })

    const [, firstCallArgs] = mockUpdateEntry.mock.calls[0]
    expect(firstCallArgs).toMatchObject({
      title: 'One Piece updated',
      type: 'anime',
      status: 'watching',
    })

    await waitFor(() => {
      expect(screen.getByText('Entrada actualizada')).toBeInTheDocument()
    })
  })

  it('shows error toast when update fails', async () => {
    mockUpdateEntry.mockRejectedValue(new Error('Update failed'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })

    act(() => {
      screen.getByTestId('edit-button').click()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    })

    act(() => {
      screen.getByRole('button', { name: 'Guardar cambios' }).click()
    })

    await waitFor(() => {
      expect(screen.getByText('Error al guardar')).toBeInTheDocument()
    })
  })

  it('opens delete confirmation dialog and redirects after delete', async () => {
    mockDeleteEntry.mockResolvedValue(undefined)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('One Piece')).toBeInTheDocument()
    })

    act(() => {
      screen.getByTestId('delete-button').click()
    })

    await waitFor(() => {
      expect(screen.getByText('¿Eliminar entrada?')).toBeInTheDocument()
    })

    act(() => {
      screen.getByRole('button', { name: 'Eliminar' }).click()
    })

    await waitFor(() => {
      expect(mockDeleteEntry.mock.calls[0][0]).toBe('entry-1')
    })

    await waitFor(() => {
      expect(screen.getByTestId('collection-page')).toBeInTheDocument()
    })
  })

  it('renders error state when entry fails to load', async () => {
    mockGetEntry.mockRejectedValue(new Error('Load failed'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Load failed')).toBeInTheDocument()
    })
  })

})

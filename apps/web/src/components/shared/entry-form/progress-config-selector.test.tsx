import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { ProgressConfigSelector } from './progress-config-selector'
import type { EntryFormValues } from './entry-form-schema'

function renderWithForm(
  element: React.ReactElement,
  defaultValues: Partial<EntryFormValues> = {}
) {
  function Wrapper() {
    const form = useForm<EntryFormValues>({
      defaultValues: {
        title: '',
        type: 'anime',
        status: 'watching',
        rating: '',
        year: '',
        notes: '',
        progress_total: '',
        ...defaultValues,
      },
    })
    return <FormProvider {...form}>{element}</FormProvider>
  }

  return render(<Wrapper />)
}

describe('ProgressConfigSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows fixed unit label for anime', () => {
    renderWithForm(<ProgressConfigSelector />, { type: 'anime' })

    expect(screen.getByText('Episodios')).toBeInTheDocument()
  })

  it('shows fixed unit label for manga', () => {
    renderWithForm(<ProgressConfigSelector />, { type: 'manga' })

    expect(screen.getByText('Capítulos')).toBeInTheDocument()
  })

  it('shows fixed unit label for game', () => {
    renderWithForm(<ProgressConfigSelector />, { type: 'game' })

    expect(screen.getByText('Horas')).toBeInTheDocument()
  })

  it('shows "+ Total" button for anime and manga', () => {
    renderWithForm(<ProgressConfigSelector />, { type: 'anime' })

    expect(screen.getByRole('button', { name: /Añadir total esperado manualmente/i })).toBeInTheDocument()
  })

  it('does not show "+ Total" button for games', () => {
    renderWithForm(<ProgressConfigSelector />, { type: 'game' })

    expect(screen.queryByRole('button', { name: /Añadir total esperado manualmente/i })).not.toBeInTheDocument()
  })

  it('opens popover, fills manual total and updates form', async () => {
    const user = userEvent.setup()
    renderWithForm(<ProgressConfigSelector />, { type: 'anime' })

    await user.click(screen.getByRole('button', { name: /Añadir total esperado manualmente/i }))

    const input = screen.getByPlaceholderText('Ej: 24')
    await user.clear(input)
    await user.type(input, '24')

    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('24')).toBeInTheDocument()
    })
  })

  it('displays AniList badge when source is AniList', () => {
    renderWithForm(
      <ProgressConfigSelector progressTotalSource="AniList" />,
      { type: 'anime', progress_total: '12' }
    )

    expect(screen.getByText('Sugerido: 12 (AniList)')).toBeInTheDocument()
  })

  it('displays HLTB badge when source is HLTB', () => {
    renderWithForm(
      <ProgressConfigSelector progressTotalSource="HLTB" />,
      { type: 'game', progress_total: '8.50' }
    )

    expect(screen.getByText('Sugerido: 8.50 h (HLTB)')).toBeInTheDocument()
  })

  it('displays Manual badge when source is manual', () => {
    renderWithForm(
      <ProgressConfigSelector progressTotalSource="manual" />,
      { type: 'anime', progress_total: '24' }
    )

    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('calls onProgressTotalSource when manual total is confirmed', async () => {
    const user = userEvent.setup()
    const handleSourceChange = vi.fn()

    renderWithForm(
      <ProgressConfigSelector onProgressTotalSource={handleSourceChange} />,
      { type: 'anime' }
    )

    await user.click(screen.getByRole('button', { name: /Añadir total esperado manualmente/i }))

    const input = screen.getByPlaceholderText('Ej: 24')
    await user.clear(input)
    await user.type(input, '24')

    await user.click(screen.getByRole('button', { name: /Confirmar/i }))

    await waitFor(() => {
      expect(handleSourceChange).toHaveBeenCalledWith('manual')
    })
  })

  it('cancels popover without updating form', async () => {
    const user = userEvent.setup()
    renderWithForm(<ProgressConfigSelector />, { type: 'anime' })

    await user.click(screen.getByRole('button', { name: /Añadir total esperado manualmente/i }))

    const input = screen.getByPlaceholderText('Ej: 24')
    await user.type(input, '99')

    await user.click(screen.getByRole('button', { name: /Cancelar/i }))

    expect(screen.queryByDisplayValue('99')).not.toBeInTheDocument()
  })
})

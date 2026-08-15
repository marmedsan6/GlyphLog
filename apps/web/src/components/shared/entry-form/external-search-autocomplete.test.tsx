import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { ExternalSearchAutocomplete } from './external-search-autocomplete'
import { useExternalSearch } from '@/hooks/useExternalSearch'
import { useGetGameDetail } from '@/hooks/useGetGameDetail'
import type { EntryFormValues } from './entry-form-schema'
import type { ExternalSearchResult } from '@/types'

function WatchProgressTotal() {
  const { control } = useFormContext<EntryFormValues>()
  const value = useWatch({ control, name: 'progress_total' })
  return <span data-testid="progress-total-value">{value ?? '(empty)'}</span>
}

vi.mock('@/hooks/useExternalSearch')
vi.mock('@/hooks/useGetGameDetail')
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}))

const mockUseExternalSearch = vi.mocked(useExternalSearch)
const mockUseGetGameDetail = vi.mocked(useGetGameDetail)

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
    return (
      <FormProvider {...form}>
        {element}
        <WatchProgressTotal />
      </FormProvider>
    )
  }

  return render(<Wrapper />)
}

function makeSearchResult(overrides: Partial<ExternalSearchResult> = {}): ExternalSearchResult {
  return {
    title: 'Test Title',
    year: 2020,
    cover_image: 'http://example.com/cover.jpg',
    type: 'anime',
    source: 'AniList',
    progress_total: null,
    slug: null,
    ...overrides,
  }
}

describe('ExternalSearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseExternalSearch.mockReturnValue({
      results: [],
      isLoading: false,
      isError: false,
      error: null,
    })
    mockUseGetGameDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  it('renders category selector defaulting to Animes and propagates selection', async () => {
    const user = userEvent.setup()

    renderWithForm(
      <ExternalSearchAutocomplete
        onSelectCover={vi.fn()}
        onClearCover={vi.fn()}
        isAutocompleted={false}
        setIsAutocompleted={vi.fn()}
      />
    )

    const selector = screen.getByLabelText('Categoría de búsqueda')
    expect(selector).toHaveValue('anime')

    await user.selectOptions(selector, 'game')
    expect(selector).toHaveValue('game')

    // El hook recibe el type elegido (game) en la última invocación.
    expect(mockUseExternalSearch).toHaveBeenLastCalledWith('', 'game')
  })

  it('fills progress_total when selecting an anime with episodes', async () => {
    const user = userEvent.setup()
    const handleSourceChange = vi.fn()
    mockUseExternalSearch.mockReturnValue({
      results: [makeSearchResult({ title: 'Naruto', progress_total: '220' })],
      isLoading: false,
      isError: false,
      error: null,
    })

    renderWithForm(
      <ExternalSearchAutocomplete
        onSelectCover={vi.fn()}
        onClearCover={vi.fn()}
        isAutocompleted={false}
        setIsAutocompleted={vi.fn()}
        onProgressTotalSource={handleSourceChange}
      />,
      { type: 'anime' }
    )

    const input = screen.getByPlaceholderText(/Buscar título/)
    await user.type(input, 'naruto')

    const result = await screen.findByText('Naruto')
    await user.click(result)

    await waitFor(() => {
      expect(screen.getByTestId('progress-total-value')).toHaveTextContent('220')
    })
    expect(handleSourceChange).toHaveBeenCalledWith('AniList')
  })

  it('fills progress_total when selecting a manga with chapters', async () => {
    const user = userEvent.setup()
    mockUseExternalSearch.mockReturnValue({
      results: [makeSearchResult({ type: 'manga', title: 'Berserk', progress_total: '380' })],
      isLoading: false,
      isError: false,
      error: null,
    })

    renderWithForm(
      <ExternalSearchAutocomplete
        onSelectCover={vi.fn()}
        onClearCover={vi.fn()}
        isAutocompleted={false}
        setIsAutocompleted={vi.fn()}
      />,
      { type: 'manga' }
    )

    const input = screen.getByPlaceholderText(/Buscar título/)
    await user.type(input, 'berserk')

    const result = await screen.findByText('Berserk')
    await user.click(result)

    await waitFor(() => {
      expect(screen.getByTestId('progress-total-value')).toHaveTextContent('380')
    })
  })

  it('triggers game detail fetch when selecting a game with slug', async () => {
    const user = userEvent.setup()
    mockUseExternalSearch.mockReturnValue({
      results: [makeSearchResult({ type: 'game', title: 'Elden Ring', slug: 'elden-ring' })],
      isLoading: false,
      isError: false,
      error: null,
    })

    renderWithForm(
      <ExternalSearchAutocomplete
        onSelectCover={vi.fn()}
        onClearCover={vi.fn()}
        isAutocompleted={false}
        setIsAutocompleted={vi.fn()}
      />,
      { type: 'game' }
    )

    const input = screen.getByPlaceholderText(/Buscar título/)
    await user.type(input, 'elden ring')

    const result = await screen.findByText('Elden Ring')
    await user.click(result)

    await waitFor(() => {
      expect(mockUseGetGameDetail).toHaveBeenCalledWith('elden-ring')
    })
  })

  it('fills game playtime when detail response arrives', async () => {
    const user = userEvent.setup()
    const handleSourceChange = vi.fn()
    mockUseExternalSearch.mockReturnValue({
      results: [makeSearchResult({ type: 'game', title: 'Witcher 3', slug: 'witcher-3' })],
      isLoading: false,
      isError: false,
      error: null,
    })

    mockUseGetGameDetail.mockReturnValue({
      data: { slug: 'witcher-3', playtime_raw: 51, playtime_hours: '51.00' },
      isLoading: false,
      isError: false,
      error: null,
    })

    renderWithForm(
      <ExternalSearchAutocomplete
        onSelectCover={vi.fn()}
        onClearCover={vi.fn()}
        isAutocompleted={false}
        setIsAutocompleted={vi.fn()}
        onProgressTotalSource={handleSourceChange}
      />,
      { type: 'game' }
    )

    const input = screen.getByPlaceholderText(/Buscar título/)
    await user.type(input, 'witcher')

    const result = await screen.findByText('Witcher 3')
    await user.click(result)

    await waitFor(() => {
      expect(screen.getByTestId('progress-total-value')).toHaveTextContent('51.00')
    })
    expect(handleSourceChange).toHaveBeenCalledWith('RAWG')
  })

  it('clears fields when clicking clear', async () => {
    const user = userEvent.setup()
    const setIsAutocompleted = vi.fn()
    const handleClearCover = vi.fn()

    renderWithForm(
      <ExternalSearchAutocomplete
        onSelectCover={vi.fn()}
        onClearCover={handleClearCover}
        isAutocompleted={true}
        setIsAutocompleted={setIsAutocompleted}
      />,
      { title: 'Naruto', type: 'anime', progress_total: '220' }
    )

    const clearButton = screen.getByRole('button', { name: /Limpiar/i })
    await user.click(clearButton)

    expect(setIsAutocompleted).toHaveBeenCalledWith(false)
    expect(handleClearCover).toHaveBeenCalled()
  })
})

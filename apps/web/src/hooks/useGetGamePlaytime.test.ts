import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGetGamePlaytime } from './useGetGamePlaytime'
import { getGamePlaytime } from '@/services/external-search.service'
import { TestQueryProvider } from '@/test/query-client-provider'

vi.mock('@/services/external-search.service')

const mockGetGamePlaytime = vi.mocked(getGamePlaytime)

describe('useGetGamePlaytime', () => {
  beforeEach(() => {
    mockGetGamePlaytime.mockReset()
  })

  it('does not fetch when title is null', () => {
    renderHook(() => useGetGamePlaytime(null), {
      wrapper: TestQueryProvider,
    })

    expect(mockGetGamePlaytime).not.toHaveBeenCalled()
  })

  it('fetches game playtime when title is provided', async () => {
    mockGetGamePlaytime.mockResolvedValue({
      title: 'Witcher 3',
      playtime_hours: '51.69',
    })

    const { result } = renderHook(() => useGetGamePlaytime('Witcher 3'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetGamePlaytime).toHaveBeenCalledWith('Witcher 3')
    expect(result.current.data?.playtime_hours).toBe('51.69')
    expect(result.current.isError).toBe(false)
  })

  it('exposes error state when the service fails', async () => {
    mockGetGamePlaytime.mockRejectedValue(new Error('HLTB unavailable'))

    const { result } = renderHook(() => useGetGamePlaytime('Witcher 3'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns empty playtime when HLTB has no data', async () => {
    mockGetGamePlaytime.mockResolvedValue({
      title: 'Unknown Game',
      playtime_hours: null,
    })

    const { result } = renderHook(() => useGetGamePlaytime('Unknown Game'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.playtime_hours).toBeNull()
  })
})

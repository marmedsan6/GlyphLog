import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGetGameDetail } from './useGetGameDetail'
import { getGameDetail } from '@/services/external-search.service'
import { TestQueryProvider } from '@/test/query-client-provider'

vi.mock('@/services/external-search.service')

const mockGetGameDetail = vi.mocked(getGameDetail)

describe('useGetGameDetail', () => {
  beforeEach(() => {
    mockGetGameDetail.mockReset()
  })

  it('does not fetch when slug is null', () => {
    renderHook(() => useGetGameDetail(null), {
      wrapper: TestQueryProvider,
    })

    expect(mockGetGameDetail).not.toHaveBeenCalled()
  })

  it('fetches game detail when slug is provided', async () => {
    mockGetGameDetail.mockResolvedValue({
      slug: 'witcher-3',
      playtime_raw: 51,
      playtime_hours: '51.00',
    })

    const { result } = renderHook(() => useGetGameDetail('witcher-3'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetGameDetail).toHaveBeenCalledWith('witcher-3')
    expect(result.current.data?.playtime_hours).toBe('51.00')
    expect(result.current.isError).toBe(false)
  })

  it('exposes error state when the service fails', async () => {
    mockGetGameDetail.mockRejectedValue(new Error('RAWG unavailable'))

    const { result } = renderHook(() => useGetGameDetail('witcher-3'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('returns empty playtime when RAWG has no playtime data', async () => {
    mockGetGameDetail.mockResolvedValue({
      slug: 'unknown-game',
      playtime_raw: null,
      playtime_hours: null,
    })

    const { result } = renderHook(() => useGetGameDetail('unknown-game'), {
      wrapper: TestQueryProvider,
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data?.playtime_hours).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deviceService } from './device.service'
import { apiClient } from '@/lib/api-client'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('deviceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generatePairingCode calls POST /devices/pair', async () => {
    const mockData = { pairing_code: 'A3X9K2', expires_in: 300 }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockData })

    const result = await deviceService.generatePairingCode()

    expect(apiClient.post).toHaveBeenCalledWith('/devices/pair')
    expect(result).toEqual(mockData)
  })

  it('listDevices calls GET /devices/ and returns devices list', async () => {
    const mockDevices = [
      {
        id: '123',
        device_name: 'Chrome Work',
        last_used_at: null,
        is_revoked: false,
        expires_at: '2026-10-18T00:00:00Z',
        created_at: '2026-07-18T00:00:00Z',
      },
    ]
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { devices: mockDevices } })

    const result = await deviceService.listDevices()

    expect(apiClient.get).toHaveBeenCalledWith('/devices/')
    expect(result).toEqual(mockDevices)
  })

  it('revokeDevice calls DELETE /devices/{id}', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({})

    await deviceService.revokeDevice('device-uuid-123')

    expect(apiClient.delete).toHaveBeenCalledWith('/devices/device-uuid-123')
  })
})

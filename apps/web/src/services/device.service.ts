import { apiClient } from '@/lib/api-client'

export interface PairingCodeResponse {
  pairing_code: string
  expires_in: number
}

export interface DeviceResponse {
  id: string
  device_name: string
  last_used_at: string | null
  is_revoked: boolean
  expires_at: string
  created_at: string
}

export interface DeviceListResponse {
  devices: DeviceResponse[]
}

export const deviceService = {
  async generatePairingCode(): Promise<PairingCodeResponse> {
    const response = await apiClient.post<PairingCodeResponse>('/devices/pair')
    return response.data
  },

  async listDevices(): Promise<DeviceResponse[]> {
    const response = await apiClient.get<DeviceListResponse>('/devices/')
    return response.data.devices
  },

  async revokeDevice(deviceId: string): Promise<void> {
    await apiClient.delete(`/devices/${deviceId}`)
  },
}

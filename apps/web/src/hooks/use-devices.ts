import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deviceService, type DeviceResponse, type PairingCodeResponse } from '@/services/device.service'

export const DEVICES_QUERY_KEY = 'devices'

export function useDevices() {
  return useQuery<DeviceResponse[], Error>({
    queryKey: [DEVICES_QUERY_KEY],
    queryFn: deviceService.listDevices,
  })
}

export function useGeneratePairingCode() {
  return useMutation<PairingCodeResponse, Error>({
    mutationFn: deviceService.generatePairingCode,
  })
}

export function useRevokeDevice() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (deviceId: string) => deviceService.revokeDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEVICES_QUERY_KEY] })
    },
  })
}

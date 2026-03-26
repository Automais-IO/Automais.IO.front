import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { devicesApi } from '../services/devicesApi'
import { getTenantId } from '../config/tenant'

export const useDevices = () => {
  const tenantId = getTenantId()
  return useQuery({
    queryKey: ['devices', tenantId],
    queryFn: () => devicesApi.getByTenant(tenantId),
    enabled: !!tenantId,
  })
}

export const useCreateDevice = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (payload) => {
      if (!tenantId) throw new Error('Tenant não encontrado. Faça login novamente.')
      return devicesApi.create(tenantId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', tenantId] })
    },
  })
}

export const useEnableWebDevice = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (devEui) => devicesApi.enableWebDevice(devEui),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', tenantId] })
    },
  })
}

export const useRegenerateWebDeviceToken = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (devEui) => devicesApi.regenerateWebDeviceToken(devEui),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', tenantId] })
    },
  })
}

export const useDisableWebDevice = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (devEui) => devicesApi.disableWebDevice(devEui),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', tenantId] })
    },
  })
}

export const useDeleteDevice = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (id) => devicesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices', tenantId] })
    },
  })
}

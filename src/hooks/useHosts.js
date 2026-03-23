import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hostsApi } from '../services/hostsApi'
import { getTenantId } from '../config/tenant'

export const useHosts = () => {
  const tenantId = getTenantId()
  return useQuery({
    queryKey: ['hosts', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('tenantId não encontrado')
      return hostsApi.getByTenant(tenantId)
    },
    enabled: !!tenantId,
    refetchInterval: () =>
      typeof document !== 'undefined' && document.hidden ? false : 15000,
  })
}

export const useHost = (id) =>
  useQuery({
    queryKey: ['host', id],
    queryFn: () => hostsApi.getById(id),
    enabled: !!id,
  })

/** Senha bootstrap do host para display remoto (mesmo par que SSH se o VNC estiver configurado assim). */
export const useRemoteDisplayCredentials = (hostId, enabled) =>
  useQuery({
    queryKey: ['host', hostId, 'remote-display-credentials'],
    queryFn: () => hostsApi.getRemoteDisplayCredentials(hostId),
    enabled: Boolean(hostId && enabled),
    staleTime: 60_000,
    retry: false,
  })

export const useCreateHost = () => {
  const qc = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (data) => hostsApi.create(tenantId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hosts', tenantId] }),
  })
}

export const useUpdateHost = () => {
  const qc = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: ({ id, data }) => hostsApi.update(id, data),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['host', v.id] })
      qc.invalidateQueries({ queryKey: ['hosts', tenantId] })
    },
  })
}

export const useDeleteHost = () => {
  const qc = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (id) => hostsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hosts', tenantId] }),
  })
}

export const useActivateSetup = () => {
  const qc = useQueryClient()
  const tenantId = getTenantId()
  return useMutation({
    mutationFn: (id) => hostsApi.activateSetup(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['host', id] })
      qc.invalidateQueries({ queryKey: ['hosts', tenantId] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../services/usersApi'
import { getTenantId } from '../config/tenant'

export const useUsers = () => {
  const tenantId = getTenantId()

  return useQuery({
    queryKey: ['users', tenantId],
    queryFn: () => usersApi.getByTenant(tenantId),
    enabled: !!tenantId,
  })
}

export const useOrphanUsers = (enabled = true) => {
  const tenantId = getTenantId()
  return useQuery({
    queryKey: ['orphanUsers', tenantId],
    queryFn: () => usersApi.getOrphans(tenantId),
    enabled: !!tenantId && enabled,
  })
}

export const useUser = (id) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()

  return useMutation({
    mutationFn: (data) => usersApi.create(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()

  return useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] })
    },
  })
}

export const useApproveOrphanUser = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()

  return useMutation({
    mutationFn: (userId) => usersApi.approveOrphan(tenantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['orphanUsers', tenantId] })
    },
  })
}

export const useRejectOrphanUser = () => {
  const queryClient = useQueryClient()
  const tenantId = getTenantId()

  return useMutation({
    mutationFn: (userId) => usersApi.rejectOrphan(tenantId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphanUsers', tenantId] })
    },
  })
}

export const useAllowedNetworksCatalog = () => {
  const tenantId = getTenantId()

  return useQuery({
    queryKey: ['allowedNetworksCatalog', tenantId],
    queryFn: () => usersApi.getAllowedNetworksCatalog(tenantId),
    enabled: !!tenantId,
  })
}

export const useUserAllowedNetworks = (userId) => {
  return useQuery({
    queryKey: ['userAllowedNetworks', userId],
    queryFn: () => usersApi.getUserAllowedNetworks(userId),
    enabled: !!userId,
  })
}

export const useUpdateUserAllowedNetworks = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }) => usersApi.updateUserAllowedNetworks(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userAllowedNetworks', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] })
    },
  })
}

export const useResetPassword = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id) => usersApi.resetPassword(id),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

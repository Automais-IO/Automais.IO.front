import { useQuery } from '@tanstack/react-query'
import { tenantsApi } from '../services/tenantsApi'
import { useAuth } from '../contexts/AuthContext'

export const useTenant = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId || user?.TenantId

  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantsApi.getById(tenantId),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  })
}

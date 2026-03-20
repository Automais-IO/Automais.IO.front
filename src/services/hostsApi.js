import api from './api'
import { getTenantId } from '../config/tenant'

export const hostsApi = {
  getByTenant: async (tenantId) => {
    const response = await api.get(`/tenants/${tenantId}/hosts`)
    return response.data
  },

  getById: async (id) => {
    const response = await api.get(`/hosts/${id}`)
    return response.data
  },

  create: async (tenantId, data) => {
    const response = await api.post(`/tenants/${tenantId}/hosts`, data)
    return response.data
  },

  update: async (id, data) => {
    const response = await api.put(`/hosts/${id}`, data)
    return response.data
  },

  delete: async (id) => {
    await api.delete(`/hosts/${id}`)
  },
}

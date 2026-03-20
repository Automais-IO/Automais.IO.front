import api from './api'

/**
 * Redes permitidas ao peer (split tunnel / AllowedIPs no cliente).
 */
export const allowedNetworksApi = {
  getByRouter: async (routerId) => {
    const response = await api.get(`/routers/${routerId}/allowed-networks`)
    return response.data
  },

  getById: async (routerId, id) => {
    const response = await api.get(`/routers/${routerId}/allowed-networks/${id}`)
    return response.data
  },

  create: async (routerId, data) => {
    const response = await api.post(`/routers/${routerId}/allowed-networks`, data)
    return response.data
  },

  update: async (routerId, id, data) => {
    const response = await api.put(`/routers/${routerId}/allowed-networks/${id}`, data)
    return response.data
  },

  delete: async (routerId, id) => {
    await api.delete(`/routers/${routerId}/allowed-networks/${id}`)
  },
}

import api from './api'

/**
 * API para redes destino do router (redes para as quais o tráfego VPN é encaminhado via este tunnel WG/iptables).
 */
export const routerDestinationNetworksApi = {
  getByRouter: async (routerId) => {
    const response = await api.get(`/routers/${routerId}/destination-networks`)
    return response.data
  },

  getById: async (routerId, id) => {
    const response = await api.get(`/routers/${routerId}/destination-networks/${id}`)
    return response.data
  },

  create: async (routerId, data) => {
    const response = await api.post(`/routers/${routerId}/destination-networks`, data)
    return response.data
  },

  update: async (routerId, id, data) => {
    const response = await api.put(`/routers/${routerId}/destination-networks/${id}`, data)
    return response.data
  },

  delete: async (routerId, id) => {
    await api.delete(`/routers/${routerId}/destination-networks/${id}`)
  },
}

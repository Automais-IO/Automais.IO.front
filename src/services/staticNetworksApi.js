import api from './api'

/** Redes estáticas no peer (RouterOS / host), tabela static_networks. */
export const staticNetworksApi = {
  getByRouter: async (routerId) => {
    const response = await api.get(`/routers/${routerId}/static-networks`)
    return response.data
  },

  getById: async (routerId, staticNetworkId) => {
    const response = await api.get(`/routers/${routerId}/static-networks/${staticNetworkId}`)
    return response.data
  },

  create: async (routerId, data) => {
    const response = await api.post(`/routers/${routerId}/static-networks`, data)
    return response.data
  },

  update: async (routerId, staticNetworkId, data) => {
    const response = await api.put(`/routers/${routerId}/static-networks/${staticNetworkId}`, data)
    return response.data
  },

  delete: async (routerId, staticNetworkId) => {
    await api.delete(`/routers/${routerId}/static-networks/${staticNetworkId}`)
  },

  batchUpdateStatus: async (routerId, data) => {
    const response = await api.post(`/routers/${routerId}/static-networks/batch-status`, data)
    return response.data
  },

  applyPending: async (routerId) => {
    const response = await api.post(`/routers/${routerId}/static-networks/apply`)
    return response.data
  },

  getVpnTunnelInterfaces: async (routerId) => {
    const response = await api.get(`/routers/${routerId}/static-networks/vpn-tunnel-interfaces`)
    return response.data
  },
}

import api from './api'

export const vpnNetworksApi = {
  // Listar redes VPN do tenant
  getByTenant: async (tenantId) => {
    const response = await api.get(`/tenants/${tenantId}/vpn/networks`)
    return response.data
  },

  // Obter rede VPN por ID
  getById: async (networkId) => {
    const response = await api.get(`/vpn/networks/${networkId}`)
    return response.data
  },

  // Criar rede VPN
  create: async (tenantId, data) => {
    const response = await api.post(`/tenants/${tenantId}/vpn/networks`, data)
    return response.data
  },

  // Atualizar rede VPN
  update: async (networkId, data) => {
    const response = await api.put(`/vpn/networks/${networkId}`, data)
    return response.data
  },

  // Deletar rede VPN
  delete: async (networkId) => {
    await api.delete(`/vpn/networks/${networkId}`)
  },

  regenerateServerKeys: async (networkId) => {
    const response = await api.post(`/vpn/networks/${networkId}/regenerate-server-keys`)
    return response.data
  },

  // Listar usuários da rede VPN
  getUsers: async (networkId) => {
    const response = await api.get(`/vpn/networks/${networkId}/users`)
    return response.data
  },
}


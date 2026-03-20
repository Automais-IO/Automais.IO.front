import api from './api'

export const usersApi = {
  // Listar usuários do tenant
  getByTenant: async (tenantId) => {
    const response = await api.get(`/tenants/${tenantId}/users`)
    return response.data
  },

  // Obter usuário por ID
  getById: async (id) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  // Criar usuário
  create: async (tenantId, data) => {
    const response = await api.post(`/tenants/${tenantId}/users`, data)
    return response.data
  },

  // Atualizar usuário
  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data)
    return response.data
  },

  // Deletar usuário
  delete: async (id) => {
    await api.delete(`/users/${id}`)
  },

  // Atualizar redes do usuário
  updateNetworks: async (id, data) => {
    const response = await api.post(`/users/${id}/networks`, data)
    return response.data
  },

  /** Catálogo de redes permitidas (por router/peer) no tenant — para atribuição VPN ao usuário. */
  getAllowedNetworksCatalog: async (tenantId) => {
    const response = await api.get(`/tenants/${tenantId}/allowed-networks-for-users`)
    return response.data
  },

  /** Redes permitidas já atribuídas ao usuário. */
  getUserAllowedNetworks: async (id) => {
    const response = await api.get(`/users/${id}/allowed-networks`)
    return response.data
  },

  /** Substitui a lista de redes permitidas do usuário. */
  updateUserAllowedNetworks: async (id, data) => {
    await api.put(`/users/${id}/allowed-networks`, data)
  },

  // Resetar senha do usuário
  resetPassword: async (id) => {
    const response = await api.post(`/users/${id}/reset-password`)
    return response.data
  },
}

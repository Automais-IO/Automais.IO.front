import api from './api'

export const tenantsApi = {
  // Obter tenant por ID
  getById: async (id) => {
    const response = await api.get(`/tenants/${id}`)
    return response.data
  },

  // Obter tenant por slug
  getBySlug: async (slug) => {
    const response = await api.get(`/tenants/by-slug/${slug}`)
    return response.data
  },

  // Listar todos os tenants (apenas para admins)
  getAll: async () => {
    const response = await api.get('/tenants')
    return response.data
  }
}

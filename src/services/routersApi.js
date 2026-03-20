import api from './api'
import { getTenantId } from '../config/tenant'

export const routersApi = {
  // Listar routers do tenant
  getByTenant: async (tenantId) => {
    const response = await api.get(`/tenants/${tenantId}/routers`)
    return response.data
  },

  // Obter router por ID
  getById: async (id) => {
    const response = await api.get(`/routers/${id}`)
    return response.data
  },

  // Criar router
  create: async (tenantId, data) => {
    const response = await api.post(`/tenants/${tenantId}/routers`, data)
    return response.data
  },

  // Atualizar router
  update: async (id, data) => {
    const response = await api.put(`/routers/${id}`, data)
    return response.data
  },

  // Deletar router
  delete: async (id) => {
    await api.delete(`/routers/${id}`)
  },

  // Testar conexão do router
  testConnection: async (id) => {
    const response = await api.post(`/routers/${id}/test-connection`)
    return response.data
  },

  // Download da configuração VPN
  downloadVpnConfig: async (routerId) => {
    const response = await api.get(`/routers/${routerId}/vpn/config/download`, {
      responseType: 'blob',
    })
    
    // Criar link de download
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    
    // Extrair nome do arquivo do header Content-Disposition ou usar padrão
    const contentDisposition = response.headers['content-disposition']
    let filename = `router_${routerId}.conf`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }
    
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  regenerateVpnPeerKeys: async (peerId) => {
    const response = await api.post(`/vpn/peers/${peerId}/regenerate-keys`)
    return response.data
  },
}


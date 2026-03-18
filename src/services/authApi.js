import api from './api'

export const authApi = {
  // Fazer login
  login: async (username, password) => {
    const response = await api.post('/auth/login', {
      username,
      password
    })
    return response.data
  },

  // Esqueceu a senha - envia nova senha temporária por email
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email })
    return response.data
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },

  // Validar token (opcional, para verificar se token ainda é válido)
  validateToken: async (token) => {
    // Se necessário, criar endpoint no backend para validar token
    // Por enquanto, vamos apenas verificar se o token existe no localStorage
    return { valid: !!token }
  }
}

import axios from 'axios'
import { API_BASE_URL } from '../config/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação quando necessário
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Se receber 401 (Unauthorized), limpar autenticação e redirecionar para login
      if (error.response.status === 401) {
        const reqUrl = error.config?.url || ''
        const isChangePassword = reqUrl.includes('/auth/change-password')
        if (!isChangePassword) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          if (window.location.pathname !== '/login' && window.location.pathname !== '/definir-senha') {
            window.location.href = '/login'
          }
        }
      }
      
      if (error.response.status === 403 && error.response.data?.code === 'MUST_CHANGE_PASSWORD') {
        if (!window.location.pathname.includes('definir-senha')) {
          window.location.assign('/definir-senha')
        }
      }

      const message = error.response.data?.message || 'Erro ao processar requisição'
      return Promise.reject(new Error(message))
    } else if (error.request) {
      // Erro de rede
      return Promise.reject(new Error('Erro de conexão. Verifique sua internet.'))
    } else {
      return Promise.reject(error)
    }
  }
)

export default api


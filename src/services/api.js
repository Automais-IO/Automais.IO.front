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
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Redirecionar para login apenas se não estiver já na página de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      
      // Erro da API
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


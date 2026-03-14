import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/authApi'
import { setTenantId } from '../config/tenant'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Carregar dados do localStorage ao inicializar
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(user)
        
        // Salvar tenantId se disponível
        if (user?.tenantId || user?.TenantId) {
          const tenantId = user.tenantId || user.TenantId
          setTenantId(tenantId)
        }
      } catch (error) {
        console.error('Erro ao carregar dados de autenticação:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const response = await authApi.login(username, password)
      
      // Salvar token e usuário
      setToken(response.token)
      setUser(response.user)
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Salvar tenantId se disponível
      if (response.user?.tenantId || response.user?.TenantId) {
        const tenantId = response.user.tenantId || response.user.TenantId
        setTenantId(tenantId)
      }
      
      return { success: true }
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer login. Verifique suas credenciais.' 
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

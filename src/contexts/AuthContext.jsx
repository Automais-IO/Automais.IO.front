import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/authApi'
import { setTenantId } from '../config/tenant'
import { jwtRequiresPasswordChange } from '../utils/jwt'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
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
        setMustChangePassword(jwtRequiresPasswordChange(storedToken))

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

  const login = async (username, password, tenantId = null) => {
    try {
      const response = await authApi.login(username, password, tenantId)
      return consumeAuthResponse(response)
    } catch (error) {
      console.error('Erro ao fazer login:', error)
      return { 
        success: false, 
        error: error.message || 'Erro ao fazer login. Verifique suas credenciais.' 
      }
    }
  }

  const completeSso = async (provider, payload) => {
    try {
      const response = await authApi.completeSso(provider, payload)
      return consumeAuthResponse(response)
    } catch (error) {
      console.error('Erro ao concluir SSO:', error)
      return {
        success: false,
        error: error.message || 'Erro ao concluir login SSO.',
      }
    }
  }

  const register = async (name, email) => {
    try {
      const response = await authApi.register(name, email)
      return consumeAuthResponse(response)
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error)
      return {
        success: false,
        error: error.message || 'Erro ao cadastrar conta.',
      }
    }
  }

  const consumeAuthResponse = (response) => {
    const requiresTenantSelection =
      response.requiresTenantSelection === true || response.RequiresTenantSelection === true

    if (requiresTenantSelection) {
      return {
        success: false,
        requiresTenantSelection: true,
        tenants: response.tenants || response.Tenants || [],
        ssoPendingToken: response.ssoPendingToken || response.SsoPendingToken || null,
      }
    }

    const isOrphanPendingApproval =
      response.isOrphanPendingApproval === true || response.IsOrphanPendingApproval === true
    if (isOrphanPendingApproval) {
      return {
        success: false,
        isOrphanPendingApproval: true,
        error:
          response.message ||
          response.Message ||
          'Conta cadastrada, mas sem associação com tenant. Solicite aprovação ao responsável.',
      }
    }

    if (!response?.token || !response?.user) {
      return {
        success: false,
        error: 'Resposta de login inválida',
      }
    }

    // Salvar token e usuário
    setToken(response.token)
    setUser(response.user)
    const needCh =
      response.mustChangePassword === true ||
      response.MustChangePassword === true ||
      jwtRequiresPasswordChange(response.token)
    setMustChangePassword(needCh)
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))

    if (response.user?.tenantId || response.user?.TenantId) {
      const tenantId = response.user.tenantId || response.user.TenantId
      setTenantId(tenantId)
    }

    return { success: true, mustChangePassword: needCh }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setMustChangePassword(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const completePasswordChange = (data) => {
    setToken(data.token)
    setUser(data.user)
    setMustChangePassword(false)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    if (data.user?.tenantId || data.user?.TenantId) {
      setTenantId(data.user.tenantId || data.user.TenantId)
    }
  }

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        mustChangePassword,
        login,
        completeSso,
        register,
        logout,
        completePasswordChange,
      }}
    >
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

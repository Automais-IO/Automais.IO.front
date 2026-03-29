import { Mail, Lock, ArrowRight } from 'lucide-react'
import AuthBrandHeader from '../../components/AuthBrandHeader'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantOptions, setTenantOptions] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      const result = await login(email, password, selectedTenantId || undefined)

      if (result.requiresTenantSelection) {
        const options = result.tenants || []
        setTenantOptions(options)
        setSelectedTenantId((current) => current || options[0]?.tenantId || options[0]?.TenantId || '')
        return
      }
      
      if (result.success) {
        navigate(result.mustChangePassword ? '/definir-senha' : '/')
      } else {
        setError(result.error || 'Erro ao fazer login')
      }
    } catch (err) {
      setError(err.message || 'Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <AuthBrandHeader />
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Mensagem de erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                    setTenantOptions([])
                    setSelectedTenantId('')
                  }}
                  className="input pl-10"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                    setTenantOptions([])
                    setSelectedTenantId('')
                  }}
                  className="input pl-10"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Seleção de tenant (apenas quando usuário tem múltiplos acessos) */}
            {tenantOptions.length > 0 && (
              <div>
                <label htmlFor="tenant" className="label">
                  Tenant
                </label>
                <select
                  id="tenant"
                  name="tenant"
                  value={selectedTenantId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value)
                    setError('')
                  }}
                  className="input"
                  disabled={isLoading}
                  required
                >
                  {tenantOptions.map((tenant) => {
                    const tenantId = tenant.tenantId || tenant.TenantId
                    const tenantName = tenant.tenantName || tenant.TenantName || tenantId
                    return (
                      <option key={tenantId} value={tenantId}>
                        {tenantName}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Lembrar de mim
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 text-base"
            >
              {isLoading ? (
                <span>Entrando...</span>
              ) : (
                <>
                  {tenantOptions.length > 0 ? 'Acessar tenant' : 'Entrar'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}


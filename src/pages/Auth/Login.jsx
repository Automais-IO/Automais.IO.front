import { Mail, Lock, ArrowRight } from 'lucide-react'
import AuthBrandHeader from '../../components/AuthBrandHeader'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/authApi'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M21.35 11.1H12v2.98h5.36c-.23 1.51-1.08 2.79-2.3 3.65v3.03h3.72c2.18-2.01 3.44-4.96 3.44-8.39 0-.42-.04-.84-.11-1.27z"
        fill="#4285F4"
      />
      <path
        d="M12 22c3.1 0 5.7-1.03 7.6-2.79l-3.72-3.03c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.71H1.76v3.1A9.996 9.996 0 0 0 12 22z"
        fill="#34A853"
      />
      <path
        d="M5.6 12.57A5.99 5.99 0 0 1 5.24 10c0-.89.15-1.75.42-2.57v-3.1H1.76A9.996 9.996 0 0 0 0 10c0 1.61.39 3.14 1.08 4.5l4.52-1.93z"
        fill="#FBBC05"
      />
      <path
        d="M12 3.98c1.68 0 3.2.58 4.39 1.73l3.29-3.29C17.69.89 15.1 0 12 0 7.91 0 4.36 2.34 2.6 5.75l4.6 1.68c.9-2.7 3.42-4.71 6.4-4.71z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login, completeSso } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantOptions, setTenantOptions] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [ssoProvider, setSsoProvider] = useState('')
  const [ssoCode, setSsoCode] = useState('')
  const [ssoState, setSsoState] = useState('')
  const [ssoPendingToken, setSsoPendingToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code') || ''
    const state = params.get('state') || ''
    const provider = sessionStorage.getItem('ssoProviderPending') || ''

    if (code && state && provider) {
      setSsoCode(code)
      setSsoState(state)
      setSsoProvider(provider)
      sessionStorage.removeItem('ssoProviderPending')
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      let result
      if (ssoProvider && (ssoCode || ssoPendingToken)) {
        result = await completeSso(ssoProvider, {
          code: ssoCode || undefined,
          state: ssoState || undefined,
          pendingToken: ssoPendingToken || undefined,
          tenantId: selectedTenantId || undefined,
        })
      } else {
        result = await login(email, password, selectedTenantId || undefined)
      }

      if (result.requiresTenantSelection) {
        const options = result.tenants || []
        setTenantOptions(options)
        setSelectedTenantId((current) => current || options[0]?.tenantId || options[0]?.TenantId || '')
        if (result.ssoPendingToken) {
          setSsoPendingToken(result.ssoPendingToken)
          setSsoCode('')
          setSsoState('')
        }
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

  const startSsoLogin = async (provider) => {
    setError('')
    setIsLoading(true)
    try {
      const redirectUri = `${window.location.origin}/login`
      sessionStorage.setItem('ssoProviderPending', provider)
      const data = await authApi.startSso(provider, redirectUri)
      const url = data.authorizationUrl || data.AuthorizationUrl
      if (!url) throw new Error('URL de autorização SSO inválida.')
      window.location.assign(url)
    } catch (err) {
      sessionStorage.removeItem('ssoProviderPending')
      setError(err.message || 'Erro ao iniciar login SSO.')
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
                    setSsoProvider('')
                    setSsoCode('')
                    setSsoState('')
                    setSsoPendingToken('')
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
                    setSsoProvider('')
                    setSsoCode('')
                    setSsoState('')
                    setSsoPendingToken('')
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
                  {tenantOptions.length > 0 ? 'Acessar tenant' : ssoProvider ? 'Concluir com SSO' : 'Entrar'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {!tenantOptions.length && !ssoProvider && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ou continue com</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => startSsoLogin('google')}
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-70"
                  >
                    <GoogleIcon />
                    Continuar com Google
                  </button>
                  <button
                    type="button"
                    onClick={() => startSsoLogin('microsoft')}
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-70"
                  >
                    <MicrosoftIcon />
                    Continuar com Microsoft
                  </button>
                </div>
              </>
            )}
          </form>

        </div>
      </div>
    </div>
  )
}


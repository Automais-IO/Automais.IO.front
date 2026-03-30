import { User, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import AuthBrandHeader from '../../components/AuthBrandHeader'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      const result = await register(name, email)
      if (result.isOrphanPendingApproval) {
        setSuccessMessage(result.error)
      } else if (!result.success) {
        setError(result.error || 'Erro ao cadastrar conta.')
      }
    } catch (err) {
      setError(err.message || 'Erro ao cadastrar conta.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <AuthBrandHeader />
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Criar cadastro</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sua conta ficara pendente ate ser aprovada no tenant contratado
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {successMessage ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Cadastro realizado</h3>
              <p className="text-sm text-amber-800">{successMessage}</p>
            </div>
            <button onClick={() => navigate('/login')} className="w-full btn btn-primary py-3 text-base">
              <ArrowLeft className="w-5 h-5" />
              Voltar para o Login
            </button>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="label">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  className="input pl-10"
                  placeholder="Seu nome"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
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
                  }}
                  className="input pl-10"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="w-full btn btn-primary py-3 text-base"
            >
              {isLoading ? 'Cadastrando...' : 'Cadastrar'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full btn btn-secondary py-3 text-base"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar para o Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

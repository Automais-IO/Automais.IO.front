import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import AuthBrandHeader from '../../components/AuthBrandHeader'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../services/authApi'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await authApi.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erro ao processar a solicitação. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <AuthBrandHeader />
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Esqueceu sua senha?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Informe seu email e enviaremos uma nova senha temporária
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {success ? (
          /* Mensagem de sucesso */
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Email enviado!
              </h3>
              <p className="text-sm text-green-700">
                Se o email <strong>{email}</strong> estiver cadastrado, você receberá uma nova senha temporária em breve.
              </p>
              <p className="text-xs text-green-600 mt-3">
                A senha temporária é válida por 12 horas. Verifique também sua caixa de spam.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full btn btn-primary py-3 text-base"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar para o Login
            </button>
          </div>
        ) : (
          /* Formulário */
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Mensagem de erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
                  }}
                  className="input pl-10"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full btn btn-primary py-3 text-base"
            >
              {isLoading ? (
                <span>Enviando...</span>
              ) : (
                'Enviar nova senha'
              )}
            </button>

            {/* Voltar para login */}
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

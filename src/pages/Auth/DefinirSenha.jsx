import { Lock } from 'lucide-react'
import BrandLogo from '../../components/BrandLogo'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/authApi'

export default function DefinirSenha() {
  const navigate = useNavigate()
  const { completePasswordChange } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirm) {
      setError('A confirmação não coincide com a nova senha.')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.changePassword(currentPassword, newPassword)
      completePasswordChange(data)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'Não foi possível alterar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center px-2">
          <BrandLogo className="h-20 sm:h-24 md:h-[6.5rem] w-auto max-w-[min(100%,420px)] object-contain mx-auto" />
        </div>
        <p className="mt-5 text-center text-xs text-gray-500 tracking-wide">
          Definir nova senha
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-4 shadow-lg sm:rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="current" className="label">
                Senha atual (temporária)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pl-10 w-full"
                  placeholder="Senha que você usou para entrar"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="new" className="label">
                Nova senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="new"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pl-10 w-full"
                  placeholder="Mínimo 8 caracteres"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="label">
                Confirmar nova senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input pl-10 w-full"
                  placeholder="Repita a nova senha"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full btn btn-primary py-3">
              {loading ? 'Salvando...' : 'Salvar e continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

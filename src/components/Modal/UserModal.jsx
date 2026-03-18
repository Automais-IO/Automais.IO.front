import { useState, useEffect } from 'react'
import Modal from './Modal'
import MessageModal from './MessageModal'
import ConfirmModal from './ConfirmModal'
import { 
  useCreateUser, 
  useUpdateUser, 
  useAvailableRoutes, 
  useUserRoutes, 
  useUpdateUserRoutes,
  useResetPassword
} from '../../hooks/useUsers'
import { Check, X, KeyRound, MailWarning } from 'lucide-react'

const roleOptions = [
  { value: 'Owner', label: 'Owner' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Operator', label: 'Operator' },
  { value: 'Viewer', label: 'Viewer' },
]

export default function UserModal({ isOpen, onClose, user = null }) {
  const isEditing = !!user
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const updateUserRoutes = useUpdateUserRoutes()
  const resetPassword = useResetPassword()
  const { data: availableRoutes = [] } = useAvailableRoutes()
  const { data: userRoutes = [] } = useUserRoutes(user?.id)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    vpnEnabled: false,
  })

  const [selectedRoutes, setSelectedRoutes] = useState(new Set())
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('basic') // 'basic' ou 'routes'
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', message: '' })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null })

  // Atualizar formData quando o usuário mudar ou o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          role: user.role || 'Viewer',
          vpnEnabled: user.vpnEnabled || false,
        })
      } else {
        setFormData({
          name: '',
          email: '',
          role: 'Viewer',
          vpnEnabled: false,
        })
      }
      setActiveTab('basic')
      setErrors({})
    }
  }, [isOpen, user])

  // Carregar rotas selecionadas quando abrir modal de edição
  useEffect(() => {
    if (isEditing && userRoutes.length > 0) {
      setSelectedRoutes(new Set(userRoutes.map(r => r.routerAllowedNetworkId)))
    } else {
      setSelectedRoutes(new Set())
    }
  }, [isEditing, userRoutes])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({ ...prev, [name]: newValue }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleRouteToggle = (routeId) => {
    setSelectedRoutes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(routeId)) {
        newSet.delete(routeId)
      } else {
        newSet.add(routeId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedRoutes.size === availableRoutes.length) {
      setSelectedRoutes(new Set())
    } else {
      setSelectedRoutes(new Set(availableRoutes.map(r => r.routerAllowedNetworkId)))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    try {
      if (isEditing) {
        // Atualizar dados básicos do usuário
        await updateUser.mutateAsync({
          id: user.id,
          data: formData,
        })
        
        // Atualizar rotas permitidas
        await updateUserRoutes.mutateAsync({
          id: user.id,
          data: {
            routerAllowedNetworkIds: Array.from(selectedRoutes)
          }
        })
      } else {
        const created = await createUser.mutateAsync(formData)
        onClose()
        const emailFail =
          created?.emailDeliveryFailedAt != null || created?.EmailDeliveryFailedAt != null
        const emailMsg =
          created?.emailDeliveryFailureMessage || created?.EmailDeliveryFailureMessage || ''
        if (emailFail) {
          setMessageModal({
            isOpen: true,
            type: 'warning',
            message: `Usuário criado, mas o e-mail não foi entregue.\n\n${emailMsg}\n\nCorrija o SMTP ou informe a senha temporária manualmente; após o e-mail funcionar, use "Resetar senha" na edição do usuário.`,
          })
        } else {
          setMessageModal({
            isOpen: true,
            type: 'success',
            message: 'Usuário criado com sucesso! O convite foi enviado por e-mail.',
          })
        }
        return
      }
      onClose()
      setMessageModal({
        isOpen: true,
        type: 'success',
        message: 'Usuário atualizado com sucesso!',
      })
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      setMessageModal({
        isOpen: true,
        type: 'error',
        message: error.message || 'Erro ao salvar usuário'
      })
    }
  }

  const handleResetPassword = () => {
    if (!user?.id) return
    
    setConfirmModal({
      isOpen: true,
      message: `Deseja realmente resetar a senha do usuário "${user.name}"? Uma nova senha temporária será enviada por email.`,
      onConfirm: async () => {
        try {
          const result = await resetPassword.mutateAsync(user.id)
          const sent = result?.emailSent !== false && result?.EmailSent !== false
          setMessageModal({
            isOpen: true,
            type: sent ? 'success' : 'warning',
            message: sent
              ? result?.message || 'Senha resetada. Um e-mail com a nova senha temporária foi enviado.'
              : (result?.message ||
                  'Senha alterada no sistema, mas o e-mail não foi entregue. Abra o usuário para ver o motivo e informe a nova senha manualmente.'),
          })
        } catch (error) {
          console.error('Erro ao resetar senha:', error)
          setMessageModal({
            isOpen: true,
            type: 'error',
            message: error.message || 'Erro ao resetar senha'
          })
        }
      }
    })
  }

  // Agrupar rotas por router
  const routesByRouter = availableRoutes.reduce((acc, route) => {
    if (!acc[route.routerId]) {
      acc[route.routerId] = {
        routerName: route.routerName,
        routes: []
      }
    }
    acc[route.routerId].routes.push(route)
    return acc
  }, {})

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuário' : 'Adicionar Usuário'}
      className="max-w-4xl"
    >
      {/* Tabs */}
      {isEditing && (
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Informações Básicas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'routes'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rotas Permitidas ({selectedRoutes.size})
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditing &&
          (user?.emailDeliveryFailedAt != null || user?.EmailDeliveryFailedAt != null) &&
          (user?.emailDeliveryFailureMessage || user?.EmailDeliveryFailureMessage) && (
            <div
              className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
              role="alert"
            >
              <MailWarning className="h-6 w-6 flex-shrink-0 text-amber-600" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-amber-800">E-mail não entregue ao usuário</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-amber-900/90">
                  {user.emailDeliveryFailureMessage || user.EmailDeliveryFailureMessage}
                </p>
                <p className="mt-2 text-xs text-amber-800/80">
                  Corrija o SMTP, use &quot;Resetar senha&quot; após o envio funcionar ou repasse a senha
                  temporária manualmente. Este aviso some quando um e-mail for enviado com sucesso.
                </p>
              </div>
            </div>
          )}
        {/* Informações Básicas - Mostrar apenas quando não está editando ou quando a aba 'basic' está ativa */}
        {(!isEditing || activeTab === 'basic') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Ex: João Silva"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input w-full ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Ex: joao@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                O email será usado como login do usuário
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input w-full"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="vpnEnabled"
                  checked={formData.vpnEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Habilitar VPN para este usuário
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Permite que o usuário se conecte à VPN e acesse rotas configuradas
              </p>
              {isEditing && (
                <p className="mt-1 text-xs text-gray-600">
                  Status atual: {formData.vpnEnabled ? 'VPN Ativada' : 'VPN Desativada'}
                </p>
              )}
            </div>

            {/* Botão de resetar senha (apenas ao editar) */}
            {isEditing && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  disabled={resetPassword.isPending}
                >
                  <KeyRound className="w-4 h-4" />
                  {resetPassword.isPending ? 'Enviando...' : 'Resetar Senha'}
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Uma nova senha temporária será gerada e enviada por email
                </p>
              </div>
            )}
          </>
        )}

        {/* Seção de Rotas (apenas ao editar e quando a aba 'routes' está ativa) */}
        {isEditing && activeTab === 'routes' && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rotas Permitidas</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Selecione quais rotas este usuário pode acessar quando conectado à VPN
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="btn btn-secondary text-sm"
              >
                {selectedRoutes.size === availableRoutes.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </button>
            </div>

            {availableRoutes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma rota disponível. Configure rotas nos routers primeiro.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {Object.entries(routesByRouter).map(([routerId, { routerName, routes }]) => (
                  <div key={routerId} className="border-b border-gray-200 last:border-b-0">
                    <div className="bg-gray-50 px-4 py-2 font-medium text-sm text-gray-700 sticky top-0">
                      {routerName}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {routes.map((route) => {
                        const isSelected = selectedRoutes.has(route.routerAllowedNetworkId)
                        return (
                          <label
                            key={route.routerAllowedNetworkId}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleRouteToggle(route.routerAllowedNetworkId)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {route.networkCidr}
                              </div>
                              {route.description && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {route.description}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary-600" />
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={createUser.isPending || updateUser.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createUser.isPending || updateUser.isPending}
          >
            {createUser.isPending || updateUser.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar'
              : 'Adicionar'}
          </button>
        </div>
      </form>

      {/* Modal de Mensagem */}
      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={() => setMessageModal({ isOpen: false, type: 'info', message: '' })}
        type={messageModal.type}
        message={messageModal.message}
      />

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        message={confirmModal.message}
      />
    </Modal>
  )
}


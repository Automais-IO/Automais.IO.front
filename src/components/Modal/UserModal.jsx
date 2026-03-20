import { useState, useEffect } from 'react'
import Modal from './Modal'
import MessageModal from './MessageModal'
import ConfirmModal from './ConfirmModal'
import {
  useCreateUser,
  useUpdateUser,
  useAllowedNetworksCatalog,
  useUserAllowedNetworks,
  useUpdateUserAllowedNetworks,
  useResetPassword,
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
  const updateUserAllowedNetworks = useUpdateUserAllowedNetworks()
  const resetPassword = useResetPassword()
  const { data: networkCatalog = [] } = useAllowedNetworksCatalog()
  const { data: userAssignments = [] } = useUserAllowedNetworks(user?.id)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    vpnEnabled: false,
    enabled: true,
  })

  const [selectedNetworkIds, setSelectedNetworkIds] = useState(new Set())
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('basic') // 'basic' | 'networks'
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', message: '' })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null })

  // Atualizar formData quando o usuário mudar ou o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (user) {
        const st = (user.status || '').toLowerCase()
        setFormData({
          name: user.name || '',
          email: user.email || '',
          role: user.role || 'Viewer',
          vpnEnabled: user.vpnEnabled || false,
          enabled: st === 'active',
        })
      } else {
        setFormData({
          name: '',
          email: '',
          role: 'Viewer',
          vpnEnabled: false,
          enabled: true,
        })
      }
      setActiveTab('basic')
      setErrors({})
    }
  }, [isOpen, user])

  useEffect(() => {
    if (isEditing && userAssignments.length > 0) {
      setSelectedNetworkIds(new Set(userAssignments.map((r) => r.allowedNetworkId)))
    } else {
      setSelectedNetworkIds(new Set())
    }
  }, [isEditing, userAssignments])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === 'checkbox' ? checked : value
    setFormData((prev) => ({ ...prev, [name]: newValue }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const toggleAllowedNetwork = (allowedNetworkId) => {
    setSelectedNetworkIds((prev) => {
      const next = new Set(prev)
      if (next.has(allowedNetworkId)) next.delete(allowedNetworkId)
      else next.add(allowedNetworkId)
      return next
    })
  }

  const handleSelectAllNetworks = () => {
    if (selectedNetworkIds.size === networkCatalog.length) {
      setSelectedNetworkIds(new Set())
    } else {
      setSelectedNetworkIds(new Set(networkCatalog.map((r) => r.allowedNetworkId)))
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
        await updateUser.mutateAsync({
          id: user.id,
          data: {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            vpnEnabled: formData.vpnEnabled,
            status: formData.enabled ? 'active' : 'disabled',
          },
        })
        
        await updateUserAllowedNetworks.mutateAsync({
          id: user.id,
          data: {
            allowedNetworkIds: Array.from(selectedNetworkIds),
          },
        })
      } else {
        const created = await createUser.mutateAsync({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          vpnEnabled: formData.vpnEnabled,
          enabled: formData.enabled,
        })
        onClose()
        if (!formData.enabled) {
          setMessageModal({
            isOpen: true,
            type: 'success',
            message:
              'Usuário criado sem acesso ao login. Marque "Usuário habilitado" na edição e use "Resetar senha" para enviar credenciais quando for liberar o acesso.',
          })
        } else {
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
              message:
                'Usuário criado e habilitado. Um e-mail com a senha inicial foi enviado (válida por 12 horas).',
            })
          }
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

  const networksByRouter = networkCatalog.reduce((acc, row) => {
    if (!acc[row.routerId]) {
      acc[row.routerId] = { routerName: row.routerName, items: [] }
    }
    acc[row.routerId].items.push(row)
    return acc
  }, {})

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar usuário' : 'Criar usuário'}
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
            onClick={() => setActiveTab('networks')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'networks'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Redes permitidas ({selectedNetworkIds.size})
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

            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Usuário habilitado (pode fazer login)
                  </span>
                  <p className="mt-1 text-xs text-gray-600">
                    Desmarcado: o usuário não entra na plataforma até você marcar novamente. Útil para
                    cadastrar antes de liberar o acesso.
                  </p>
                </div>
              </label>
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
                Permite que o usuário se conecte à VPN e acesse as redes permitidas configuradas
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

        {isEditing && activeTab === 'networks' && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Redes permitidas na VPN</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Selecione quais redes este usuário pode alcançar quando conectado à VPN
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAllNetworks}
                className="btn btn-secondary text-sm"
              >
                {selectedNetworkIds.size === networkCatalog.length
                  ? 'Desmarcar todas'
                  : 'Selecionar todas'}
              </button>
            </div>

            {networkCatalog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma rede disponível. Configure redes permitidas nos routers primeiro.</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {Object.entries(networksByRouter).map(([routerId, { routerName, items }]) => (
                  <div key={routerId} className="border-b border-gray-200 last:border-b-0">
                    <div className="bg-gray-50 px-4 py-2 font-medium text-sm text-gray-700 sticky top-0">
                      {routerName}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map((row) => {
                        const id = row.allowedNetworkId
                        const isSelected = selectedNetworkIds.has(id)
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAllowedNetwork(id)}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-900">
                                {row.networkCidr}
                              </div>
                              {row.description && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {row.description}
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
              ? 'Salvar'
              : 'Criar usuário'}
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


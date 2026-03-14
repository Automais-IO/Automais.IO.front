import { useState } from 'react'
import { Users as UsersIcon, Plus, Search, Mail, Shield, MoreVertical, Trash2, Edit, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useUsers, useDeleteUser } from '../../hooks/useUsers'
import UserModal from '../../components/Modal/UserModal'
import MessageModal from '../../components/Modal/MessageModal'
import ConfirmModal from '../../components/Modal/ConfirmModal'

const roleLabels = {
  Owner: { label: 'Owner', color: 'badge-primary' },
  Admin: { label: 'Admin', color: 'badge-secondary' },
  Operator: { label: 'Operator', color: 'badge-success' },
  Viewer: { label: 'Viewer', color: 'badge-gray' },
}

const statusLabels = {
  Invited: { label: 'Convidado', color: 'badge-warning' },
  Active: { label: 'Ativo', color: 'badge-success' },
  Suspended: { label: 'Suspenso', color: 'badge-warning' },
  Disabled: { label: 'Desabilitado', color: 'badge-gray' },
}

export default function Users() {
  const { data: users, isLoading, error } = useUsers()
  const deleteUser = useDeleteUser()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'info', message: '' })
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null })

  const handleAdd = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      message: `Tem certeza que deseja remover o usuário "${name}"?`,
      onConfirm: async () => {
        try {
          await deleteUser.mutateAsync(id)
          setMessageModal({
            isOpen: true,
            type: 'success',
            message: 'Usuário removido com sucesso!'
          })
        } catch (error) {
          setMessageModal({
            isOpen: true,
            type: 'error',
            message: error.message || 'Erro ao remover usuário'
          })
        }
      }
    })
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  }) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando usuários...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Erro ao carregar usuários: {error.message}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie usuários e permissões do tenant
          </p>
        </div>
        <button onClick={handleAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Adicionar Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">
            {users?.length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Total de Usuários</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">
            {users?.filter((u) => u.status === 'Active').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Ativos</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-primary-600">
            {users?.filter((u) => u.role === 'Admin' || u.role === 'Owner').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Admins</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {users?.filter((u) => u.status === 'Invited').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Convidados</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 input"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-48"
        >
          <option value="all">Todas as roles</option>
          <option value="Owner">Owner</option>
          <option value="Admin">Admin</option>
          <option value="Operator">Operator</option>
          <option value="Viewer">Viewer</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-48"
        >
          <option value="all">Todos os status</option>
          <option value="Active">Ativos</option>
          <option value="Invited">Convidados</option>
          <option value="Suspended">Suspensos</option>
          <option value="Disabled">Desabilitados</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Último Login
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Membro Desde
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-purple rounded-lg flex items-center justify-center text-white font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={clsx('badge', roleLabels[user.role]?.color || 'badge-gray')}>
                        <Shield className="w-3 h-3" />
                        {roleLabels[user.role]?.label || user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={clsx(
                        'badge',
                        statusLabels[user.status]?.color || 'badge-gray'
                      )}>
                        {statusLabels[user.status]?.label || user.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR')
                          : 'Nunca'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={deleteUser.isPending}
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
      />

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
    </div>
  )
}


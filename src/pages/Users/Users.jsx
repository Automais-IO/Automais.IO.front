import { Users as UsersIcon, Plus, Search, Mail, Shield, MoreVertical, AlertCircle, MailWarning, Check, X } from 'lucide-react'
import clsx from 'clsx'
import { useApproveOrphanUser, useOrphanUsers, useRejectOrphanUser, useUsers } from '../../hooks/useUsers'
import UserModal from '../../components/Modal/UserModal'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const roleLabels = {
  owner: { label: 'Owner', color: 'badge-primary' },
  admin: { label: 'Admin', color: 'badge-secondary' },
  operator: { label: 'Operator', color: 'badge-success' },
  viewer: { label: 'Viewer', color: 'badge-gray' },
}

export default function Users() {
  const { user } = useAuth()
  const isGlobalUser = Boolean(user?.isGlobalUser || user?.IsGlobalUser)
  const { data: users, isLoading, error } = useUsers()
  const { data: orphanUsers, isLoading: isOrphansLoading } = useOrphanUsers(isGlobalUser)
  const approveOrphanMutation = useApproveOrphanUser()
  const rejectOrphanMutation = useRejectOrphanUser()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const handleAdd = () => {
    setSelectedUser(null)
    setIsModalOpen(true)
  }

  const handleEdit = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter.toLowerCase()
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'enabled' && user.status === 'active') ||
      (statusFilter === 'disabled' && user.status !== 'active')
    return matchesSearch && matchesRole && matchesStatus
  }) || []

  const stats = {
    total: users?.length || 0,
    active: users?.filter((u) => u.status === 'active').length || 0,
    admins: users?.filter((u) => u.role === 'admin' || u.role === 'owner').length || 0,
    semAcesso: users?.filter((u) => u.status !== 'active').length || 0,
  }

  const handleApproveOrphan = async (userId) => {
    await approveOrphanMutation.mutateAsync(userId)
  }

  const handleRejectOrphan = async (userId) => {
    await rejectOrphanMutation.mutateAsync(userId)
  }

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
          Criar usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">Total de usuários</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600 mt-1">Com acesso (login)</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-primary-600">{stats.admins}</div>
          <div className="text-sm text-gray-600 mt-1">Admins / Owners</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.semAcesso}</div>
          <div className="text-sm text-gray-600 mt-1">Sem acesso ao login</div>
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
          className="input w-48"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Todas as roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="operator">Operator</option>
          <option value="viewer">Viewer</option>
        </select>
        <select 
          className="input w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="enabled">Com acesso (login)</option>
          <option value="disabled">Sem acesso</option>
        </select>
      </div>

      {isGlobalUser && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-amber-50">
            <h2 className="text-sm font-semibold text-amber-900">
              Cadastros pendentes (orfaos sem tenant)
            </h2>
            <p className="text-xs text-amber-800 mt-1">
              Aprove para associar ao tenant atual com perfil Viewer, ou rejeite para excluir.
            </p>
          </div>
          {isOrphansLoading ? (
            <div className="p-4 text-sm text-gray-600">Carregando fila de orfaos...</div>
          ) : !orphanUsers?.length ? (
            <div className="p-4 text-sm text-gray-600">Nao ha usuarios orfaos pendentes.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuario</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cadastro</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {orphanUsers.map((orphan) => (
                    <tr key={orphan.userId}>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">{orphan.name || 'Sem nome'}</div>
                        <div className="text-sm text-gray-600">{orphan.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {orphan.createdAt ? new Date(orphan.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveOrphan(orphan.userId)}
                            disabled={approveOrphanMutation.isPending || rejectOrphanMutation.isPending}
                            className="btn btn-secondary text-xs px-3 py-2"
                          >
                            <Check className="w-4 h-4" />
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectOrphan(orphan.userId)}
                            disabled={approveOrphanMutation.isPending || rejectOrphanMutation.isPending}
                            className="btn btn-danger text-xs px-3 py-2"
                          >
                            <X className="w-4 h-4" />
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="card p-12 text-center">
          <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Nenhum usuário encontrado'
              : 'Nenhum usuário cadastrado'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando o primeiro usuário'}
          </p>
          {(!searchTerm && roleFilter === 'all' && statusFilter === 'all') && (
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Criar usuário
            </button>
          )}
        </div>
      ) : (
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
                    Acesso
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
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-purple rounded-lg flex items-center justify-center text-white font-semibold">
                          {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'Sem nome'}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1 flex-wrap">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            {user.email}
                            {(user.emailDeliveryFailedAt != null || user.EmailDeliveryFailedAt != null) && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200"
                                title={
                                  user.emailDeliveryFailureMessage ||
                                  user.EmailDeliveryFailureMessage ||
                                  'Falha ao enviar e-mail — abra o usuário para detalhes'
                                }
                              >
                                <MailWarning className="w-3 h-3" />
                                E-mail não enviado
                              </span>
                            )}
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
                      <span
                        className={clsx(
                          'badge',
                          user.status === 'active' ? 'badge-success' : 'badge-gray'
                        )}
                      >
                        {user.status === 'active' ? 'Habilitado' : 'Sem acesso'}
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
                        {user.createdAt 
                          ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
      />
    </div>
  )
}


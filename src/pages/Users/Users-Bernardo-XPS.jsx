import { Users as UsersIcon, Plus, Search, Mail, Shield, MoreVertical } from 'lucide-react'
import clsx from 'clsx'

const users = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@acme.com',
    role: 'owner',
    status: 'active',
    lastLogin: '2 horas atrás',
    createdAt: '2024-01-10',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@acme.com',
    role: 'admin',
    status: 'active',
    lastLogin: '5 minutos atrás',
    createdAt: '2024-02-15',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.johnson@acme.com',
    role: 'operator',
    status: 'active',
    lastLogin: '1 dia atrás',
    createdAt: '2024-03-20',
  },
  {
    id: 4,
    name: 'Alice Williams',
    email: 'alice.williams@acme.com',
    role: 'viewer',
    status: 'active',
    lastLogin: '3 dias atrás',
    createdAt: '2024-04-05',
  },
  {
    id: 5,
    name: 'Charlie Brown',
    email: 'charlie.brown@acme.com',
    role: 'operator',
    status: 'inactive',
    lastLogin: '30 dias atrás',
    createdAt: '2024-01-25',
  },
]

const roleLabels = {
  owner: { label: 'Owner', color: 'badge-primary' },
  admin: { label: 'Admin', color: 'badge-secondary' },
  operator: { label: 'Operator', color: 'badge-success' },
  viewer: { label: 'Viewer', color: 'badge-gray' },
}

export default function Users() {
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
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Convidar Usuário
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">24</div>
          <div className="text-sm text-gray-600 mt-1">Total de Usuários</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">22</div>
          <div className="text-sm text-gray-600 mt-1">Ativos</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-primary-600">5</div>
          <div className="text-sm text-gray-600 mt-1">Admins</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">2</div>
          <div className="text-sm text-gray-600 mt-1">Convites Pendentes</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuários..."
            className="w-full pl-10 input"
          />
        </div>
        <select className="input w-48">
          <option>Todas as roles</option>
          <option>Owner</option>
          <option>Admin</option>
          <option>Operator</option>
          <option>Viewer</option>
        </select>
        <select className="input w-48">
          <option>Todos os status</option>
          <option>Ativos</option>
          <option>Inativos</option>
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
              {users.map((user) => (
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
                    <span className={clsx('badge', roleLabels[user.role].color)}>
                      <Shield className="w-3 h-3" />
                      {roleLabels[user.role].label}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={clsx(
                      'badge',
                      user.status === 'active' ? 'badge-success' : 'badge-gray'
                    )}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-700">{user.lastLogin}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-700">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


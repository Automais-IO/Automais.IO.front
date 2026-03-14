import { Radio, Plus, Search, MapPin, Signal, Activity, Wifi } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

export default function Gateways() {
  // TODO: Implementar busca de gateways reais quando a API estiver disponível
  const gateways = []
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredGateways = gateways.filter((gateway) => {
    const matchesSearch = gateway.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gateway.eui?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || gateway.status === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: gateways.length,
    online: gateways.filter(g => g.status === 'online').length,
    warning: gateways.filter(g => g.status === 'warning').length,
    devicesConnected: gateways.reduce((sum, g) => sum + (g.devicesConnected || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gateways</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie seus gateways LoRaWAN
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Novo Gateway
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">Total de Gateways</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.online}</div>
          <div className="text-sm text-gray-600 mt-1">Online</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
          <div className="text-sm text-gray-600 mt-1">Atenção</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-primary-600">{stats.devicesConnected}</div>
          <div className="text-sm text-gray-600 mt-1">Devices Conectados</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou EUI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 input"
          />
        </div>
        <select 
          className="input w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos os status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Gateways Grid */}
      {filteredGateways.length === 0 ? (
        <div className="card p-12 text-center">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all'
              ? 'Nenhum gateway encontrado'
              : 'Nenhum gateway cadastrado'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro gateway'}
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Novo Gateway
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGateways.map((gateway) => (
            <div key={gateway.id} className="card p-6 card-hover cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={clsx(
                    'p-3 rounded-xl',
                    gateway.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
                  )}>
                    <Radio className={clsx(
                      'w-6 h-6',
                      gateway.status === 'online' ? 'text-green-600' : 'text-gray-400'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {gateway.name}
                      </h3>
                      <span className={clsx(
                        'badge',
                        gateway.status === 'online' ? 'badge-success' : 'badge-gray'
                      )}>
                        <span className={clsx(
                          'w-1.5 h-1.5 rounded-full',
                          gateway.status === 'online' ? 'bg-green-600' : 'bg-gray-400'
                        )}></span>
                        {gateway.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {gateway.eui && (
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {gateway.eui}
                      </p>
                    )}
                    {gateway.location && (
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-2">
                        <MapPin className="w-3 h-3" />
                        {gateway.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                {gateway.signal !== undefined && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Sinal</div>
                    <div className="flex items-center gap-1">
                      <Signal className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-gray-900">{gateway.signal}%</span>
                    </div>
                  </div>
                )}
                {gateway.devicesConnected !== undefined && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Devices</div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4 text-primary-600" />
                      <span className="text-sm font-semibold text-gray-900">{gateway.devicesConnected}</span>
                    </div>
                  </div>
                )}
                {gateway.uptime && (
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Uptime</div>
                    <div className="flex items-center gap-1">
                      <Wifi className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">{gateway.uptime}</span>
                    </div>
                  </div>
                )}
              </div>

              {gateway.lastSeen && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
                  Última atividade: <span className="font-medium text-gray-900">{gateway.lastSeen}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


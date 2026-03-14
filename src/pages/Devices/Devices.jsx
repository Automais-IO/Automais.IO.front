import { Cpu, Plus, Search, Filter, Download, MapPin, Battery, Signal, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

export default function Devices() {
  // TODO: Implementar busca de devices reais quando a API estiver disponível
  const devices = []
  const [searchTerm, setSearchTerm] = useState('')
  const [applicationFilter, setApplicationFilter] = useState('all')

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.devEui?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesApplication = applicationFilter === 'all' || device.application === applicationFilter
    return matchesSearch && matchesApplication
  })

  const stats = {
    total: devices.length,
    active: devices.filter(d => d.status === 'active').length,
    warning: devices.filter(d => d.status === 'warning').length,
    offline: devices.filter(d => d.status === 'offline').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie todos os seus dispositivos IoT
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-outline" disabled={devices.length === 0}>
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Novo Device
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">Total de Devices</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600 mt-1">Ativos</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
          <div className="text-sm text-gray-600 mt-1">Atenção</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
          <div className="text-sm text-gray-600 mt-1">Offline</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou DevEUI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 input"
          />
        </div>
        <select 
          className="input w-48"
          value={applicationFilter}
          onChange={(e) => setApplicationFilter(e.target.value)}
        >
          <option value="all">Todas as applications</option>
          {/* TODO: Carregar applications dinamicamente quando a API estiver disponível */}
        </select>
        <button className="btn btn-ghost">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* Devices Table */}
      {filteredDevices.length === 0 ? (
        <div className="card p-12 text-center">
          <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || applicationFilter !== 'all'
              ? 'Nenhum device encontrado'
              : 'Nenhum device cadastrado'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || applicationFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece adicionando seu primeiro device'}
          </p>
          {(!searchTerm && applicationFilter === 'all') && (
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Novo Device
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
                    Device
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Application
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sinal
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Bateria
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Localização
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Última Atividade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <Cpu className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {device.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {device.devEui}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-700">{device.application}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={clsx(
                        'badge',
                        device.status === 'active' && 'badge-success',
                        device.status === 'warning' && 'badge-warning',
                        device.status === 'offline' && 'badge-error'
                      )}>
                        {device.status === 'active' ? 'Ativo' : device.status === 'warning' ? 'Atenção' : 'Offline'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {device.signal !== undefined && (
                        <div className="flex items-center gap-2">
                          <Signal className={clsx(
                            'w-4 h-4',
                            device.signal > 80 ? 'text-green-600' : 
                            device.signal > 50 ? 'text-yellow-600' : 'text-red-600'
                          )} />
                          <span className="text-sm text-gray-700">{device.signal}%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {device.battery !== undefined && (
                        <div className="flex items-center gap-2">
                          <Battery className={clsx(
                            'w-4 h-4',
                            device.battery > 50 ? 'text-green-600' : 
                            device.battery > 20 ? 'text-yellow-600' : 'text-red-600'
                          )} />
                          <span className="text-sm text-gray-700">{device.battery}%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {device.location && (
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {device.location}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">{device.lastSeen || 'N/A'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


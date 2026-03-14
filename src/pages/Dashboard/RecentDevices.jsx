import { Cpu, Activity, Clock } from 'lucide-react'
import clsx from 'clsx'

export default function RecentDevices() {
  // TODO: Implementar busca de devices reais quando a API estiver disponível
  const devices = []

  return (
    <div className="card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Devices Recentes</h3>
          <p className="text-sm text-gray-600 mt-1">Última atividade dos dispositivos</p>
        </div>
        <button className="btn btn-primary">
          Adicionar Device
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-12">
          <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum device recente encontrado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
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
                  Bateria
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Última Atividade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 transition-colors">
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
                    <span 
                      className={clsx(
                        'badge',
                        device.status === 'active' && 'badge-success',
                        device.status === 'warning' && 'badge-warning',
                        device.status === 'inactive' && 'badge-gray'
                      )}
                    >
                      <Activity className="w-3 h-3" />
                      {device.status === 'active' ? 'Ativo' : 'Atenção'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={clsx(
                            'h-full rounded-full transition-all',
                            device.battery > 50 ? 'bg-green-500' : 
                            device.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${device.battery}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-10">
                        {device.battery}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {device.lastSeen}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


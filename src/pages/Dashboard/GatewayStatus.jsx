import { Radio, Signal, MapPin } from 'lucide-react'
import clsx from 'clsx'

export default function GatewayStatus() {
  // TODO: Implementar busca de gateways reais quando a API estiver disponível
  const gateways = []

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Status dos Gateways</h3>
        <p className="text-sm text-gray-600 mt-1">Todos os gateways operacionais</p>
      </div>

      {gateways.length === 0 ? (
        <div className="text-center py-12">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum gateway encontrado</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {gateways.map((gateway) => (
              <div 
                key={gateway.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className={clsx(
                  'p-2 rounded-lg',
                  gateway.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
                )}>
                  <Radio className={clsx(
                    'w-5 h-5',
                    gateway.status === 'online' ? 'text-green-600' : 'text-gray-400'
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {gateway.name}
                    </h4>
                    <span className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      gateway.status === 'online' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    )}>
                      <span className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        gateway.status === 'online' ? 'bg-green-600' : 'bg-gray-400'
                      )}></span>
                      {gateway.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  {gateway.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      {gateway.location}
                    </div>
                  )}
                </div>

                {gateway.signal !== undefined && (
                  <div className="flex items-center gap-2">
                    <Signal className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {gateway.signal}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="mt-4 w-full py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            Ver todos os gateways
          </button>
        </>
      )}
    </div>
  )
}


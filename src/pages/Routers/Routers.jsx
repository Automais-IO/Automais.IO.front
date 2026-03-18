import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Plus, Search, Trash2, Edit, AlertCircle, Download, Wifi, WifiOff, Cpu, HardDrive, Thermometer, KeyRound, Terminal } from 'lucide-react'
import { useRouters, useDeleteRouter } from '../../hooks/useRouters'
import RouterModal from '../../components/Modal/RouterModal'
import Modal from '../../components/Modal/Modal'
import { routersApi } from '../../services/routersApi'
import { useSignalR } from '../../hooks/useSignalR'
import api from '../../services/api'
import clsx from 'clsx'

const statusLabels = {
  Online: { label: 'VPN online', color: 'badge-success' },
  Offline: { label: 'VPN offline', color: 'badge-gray' },
  Maintenance: { label: 'Manutenção', color: 'badge-warning' },
  Error: { label: 'Erro', color: 'badge-error' },
}

/** Status da API RouterOS (8728), independente da VPN */
const apiAuthStatusOrder = ['Unknown', 'Ok', 'AuthFailed', 'Unreachable']

function normalizeRouterOsApiAuthStatus(v) {
  if (v === undefined || v === null) return 'Unknown'
  const n = Number(v)
  if (!Number.isNaN(n) && n >= 0 && n < apiAuthStatusOrder.length) {
    return apiAuthStatusOrder[n]
  }
  const s = String(v)
  return apiAuthStatusOrder.includes(s) ? s : 'Unknown'
}

const apiAuthLabels = {
  Unknown: { label: 'API não verificada', color: 'badge-gray', hint: 'Aguardando checagem do serviço RouterOS' },
  Ok: { label: 'API OK', color: 'badge-success', hint: 'Autenticação RouterOS (8728) funcionando' },
  AuthFailed: { label: 'API: auth falhou', color: 'badge-error', hint: 'Usuário/senha incorretos ou sem permissão' },
  Unreachable: { label: 'API inacessível', color: 'badge-warning', hint: 'Firewall, rota ou porta 8728' },
}

export default function Routers() {
  const navigate = useNavigate()
  const { data: routers, isLoading, error, refetch, isFetching } = useRouters()
  const deleteRouter = useDeleteRouter()
  const { isConnected: isSignalRConnected } = useSignalR('RouterStatusChanged', () => {
    // Callback vazio - o useRouters já cuida da atualização
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRouter, setSelectedRouter] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [renewConfirmRouter, setRenewConfirmRouter] = useState(null)
  const [renewResult, setRenewResult] = useState(null)

  const formatBytes = (bytes) => {
    if (!bytes || bytes === '0') return '0 B'
    const num = parseInt(bytes)
    if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`
    if (num >= 1048576) return `${(num / 1048576).toFixed(2)} MB`
    if (num >= 1024) return `${(num / 1024).toFixed(2)} KB`
    return `${num} B`
  }

  const getRouterHardwareInfo = (router) => {
    if (!router.hardwareInfo) return null
    try {
      return JSON.parse(router.hardwareInfo)
    } catch {
      return null
    }
  }

  const handleAdd = () => {
    setSelectedRouter(null)
    setIsModalOpen(true)
  }

  const handleEdit = (router) => {
    setSelectedRouter(router)
    setIsModalOpen(true)
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja remover o router "${name}"?`)) {
      try {
        await deleteRouter.mutateAsync(id)
      } catch (error) {
        alert(error.message || 'Erro ao remover router')
      }
    }
  }

  const handleDownloadConfig = async (routerId, routerName) => {
    try {
      await routersApi.downloadVpnConfig(routerId)
    } catch (error) {
        alert(error.message || 'Erro ao baixar configuração VPN')
    }
  }

  const openRenewPeerConfirm = (e, router) => {
    e.stopPropagation()
    if (!router.wireGuardPeerId) return
    setRenewConfirmRouter(router)
  }

  const closeRenewPeerConfirm = () => setRenewConfirmRouter(null)

  const handleConfirmRegeneratePeerKeys = async () => {
    if (!renewConfirmRouter?.wireGuardPeerId) return
    const router = renewConfirmRouter
    setRenewConfirmRouter(null)
    try {
      await routersApi.regenerateWireGuardPeerKeys(router.wireGuardPeerId)
      await refetch()
      setRenewResult({
        success: true,
        message: 'Chaves renovadas. Baixe novamente a Config VPN e importe no router.'
      })
    } catch (error) {
      setRenewResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao renovar chaves'
      })
    }
  }

  const filteredRouters = routers?.filter((router) =>
    router.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    router.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando routers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Erro ao carregar routers: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Routers</h1>
            <p className="mt-1 text-sm text-gray-600">
              Gerencie seus routers MikroTik —{' '}
              <span className="text-gray-500">
                <strong className="text-gray-700">VPN</strong> = túnel WireGuard;{' '}
                <strong className="text-gray-700">API</strong> = RouterOS porta 8728
              </span>
            </p>
          </div>
          {/* Indicador de conexão SignalR e atualização */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2" title={isSignalRConnected ? 'Atualização em tempo real ativa' : 'Atualização em tempo real desconectada'}>
              {isSignalRConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-xs text-gray-500">
                {isSignalRConnected ? 'Tempo real' : 'Offline'}
              </span>
            </div>
            {isFetching && (
              <div className="flex items-center gap-2 text-xs text-blue-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Atualizando...</span>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleAdd} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Adicionar Router
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">
            {routers?.length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Total de Routers</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">
            {routers?.filter((r) => r.status === 'Online').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Online</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-600">
            {routers?.filter((r) => r.status === 'Offline').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Offline</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-red-600">
            {routers?.filter((r) => r.status === 'Error').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Com Erro</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou número de série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 input"
          />
        </div>
      </div>

      {/* Routers Grid */}
      {filteredRouters.length === 0 ? (
        <div className="card p-12 text-center">
          <Radio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum router encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'Tente ajustar sua busca'
              : 'Comece adicionando seu primeiro router'}
          </p>
          {!searchTerm && (
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Adicionar Router
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRouters.map((router) => (
            <div 
              key={router.id} 
              className="card p-6 cursor-pointer border-2 border-transparent hover:border-primary-500 transition-colors"
              onClick={() => navigate(`/routers/${router.id}/management`)}
            >
              <div className="flex gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg shrink-0 self-start">
                  <Radio className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{router.name}</h3>
                    <span
                      className={clsx(
                        'badge text-xs shrink-0',
                        statusLabels[router.status]?.color || 'badge-gray'
                      )}
                      title="Status do túnel WireGuard (servidor VPN)"
                    >
                      {statusLabels[router.status]?.label || router.status}
                    </span>
                    {(() => {
                      const apiKey = normalizeRouterOsApiAuthStatus(router.routerOsApiAuthStatus)
                      const apiMeta = apiAuthLabels[apiKey] || apiAuthLabels.Unknown
                      const apiTitle =
                        [apiMeta.hint, router.routerOsApiAuthMessage].filter(Boolean).join(' — ') ||
                        apiMeta.hint
                      return (
                        <span
                          className={clsx('badge text-xs shrink-0 inline-flex items-center gap-1', apiMeta.color)}
                          title={apiTitle}
                        >
                          <Terminal className="w-3 h-3 opacity-80" />
                          {apiMeta.label}
                        </span>
                      )
                    })()}
                  </div>
                  {router.routerOsApiAuthMessage &&
                    normalizeRouterOsApiAuthStatus(router.routerOsApiAuthStatus) !== 'Ok' && (
                      <p className="text-xs text-amber-800 bg-amber-50/80 rounded px-2 py-1 mt-1 line-clamp-2">
                        {router.routerOsApiAuthMessage}
                      </p>
                    )}
                  <div className="flex justify-end gap-2 mt-1">
                    {router.vpnNetworkId && router.wireGuardPeerId && (
                      <button
                        type="button"
                        onClick={(e) => openRenewPeerConfirm(e, router)}
                        className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Renovar chaves do peer"
                      >
                        <KeyRound className="w-4 h-4 text-amber-600" />
                      </button>
                    )}
                    {router.vpnNetworkId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadConfig(router.id, router.name)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Baixar configuração VPN (.conf)"
                      >
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(router)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(router.id, router.name)
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                      disabled={deleteRouter.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                  {router.serialNumber && (
                    <p className="text-xs text-gray-500 font-mono mt-2">
                      {router.serialNumber}
                    </p>
                  )}
                  {router.model && (
                    <p className="text-sm text-gray-600 mt-1">{router.model}</p>
                  )}
                  {router.vpnTunnelIp && (
                    <p className="text-xs text-gray-600 mt-1 font-mono" title="IP do peer na VPN — usado para conectar ao router (API/ping)">
                      IP na VPN: <span className="text-primary-600 font-medium">{router.vpnTunnelIp}</span>
                    </p>
                  )}
                  {router.vpnNetworkId && !router.wireGuardPeerId && (
                    <div className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-block">
                      VPN: sem peer WireGuard
                    </div>
                  )}
                  {router.vpnNetworkId && router.wireGuardPeerId && !router.wireGuardPeerKeysConfigured && (
                    <div className="mt-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5 inline-block">
                      Chaves peer incompletas
                    </div>
                  )}
                </div>
              </div>

              {router.description && (
                <p className="text-sm text-gray-600 mb-4">{router.description}</p>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Firmware</div>
                  <div className="text-xs font-semibold text-gray-900">
                    {router.firmwareVersion || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Latência</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {router.latency !== null && router.latency !== undefined ? (
                      <span className={router.latency < 50 ? 'text-green-600' : router.latency < 100 ? 'text-yellow-600' : 'text-red-600'}>
                        {router.latency}<span className="text-xs">ms</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Última Atividade</div>
                  <div className="text-xs font-semibold text-gray-900">
                    {router.lastSeenAt
                      ? new Date(router.lastSeenAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Nunca'}
                  </div>
                </div>
              </div>

              {/* Informações de Hardware (se disponível) */}
              {(() => {
                const hardwareInfo = getRouterHardwareInfo(router)
                if (!hardwareInfo) return null
                
                return (
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 mt-4">
                    {hardwareInfo.cpuLoad && (
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-gray-600">CPU</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {hardwareInfo.cpuLoad}%
                          </div>
                        </div>
                      </div>
                    )}
                    {hardwareInfo.memoryUsage && (
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-xs text-gray-600">Memória Livre</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {formatBytes(hardwareInfo.memoryUsage)}
                          </div>
                        </div>
                      </div>
                    )}
                    {hardwareInfo.temperature && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Thermometer className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="text-xs text-gray-600">Temperatura</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {hardwareInfo.temperature}°C
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Modal editar router */}
      <RouterModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedRouter(null)
        }}
        router={selectedRouter}
      />

      {/* Modal: confirmar renovar chaves do peer */}
      <Modal
        isOpen={!!renewConfirmRouter}
        onClose={closeRenewPeerConfirm}
        title="Renovar chaves WireGuard do router?"
      >
        {renewConfirmRouter && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Router: <strong>{renewConfirmRouter.name}</strong>
            </p>
            <p className="text-sm text-gray-600">
              O túnel VPN cairá até você aplicar o novo arquivo .conf no MikroTik. Após confirmar, baixe novamente em &quot;Config VPN&quot; e importe no router.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={closeRenewPeerConfirm} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRegeneratePeerKeys}
                className="btn btn-primary bg-amber-600 hover:bg-amber-700"
              >
                Renovar chaves
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: resultado da renovação */}
      <Modal
        isOpen={!!renewResult}
        onClose={() => setRenewResult(null)}
        title={renewResult?.success ? 'Sucesso' : 'Erro'}
      >
        {renewResult && (
          <div className="space-y-4">
            <p className={renewResult.success ? 'text-gray-700' : 'text-red-700'}>
              {renewResult.message}
            </p>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button type="button" onClick={() => setRenewResult(null)} className="btn btn-primary">
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}


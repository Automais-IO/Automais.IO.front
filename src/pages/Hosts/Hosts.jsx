import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Server, Plus, Search, Trash2, Edit, Terminal, AlertCircle,
  Plug, Cpu, HardDrive, Database, Activity, ShieldAlert,
} from 'lucide-react'
import { useHosts, useDeleteHost } from '../../hooks/useHosts'
import HostModal from '../../components/Modal/HostModal'
import ConnectHostModal from '../../components/Modal/ConnectHostModal'
import Modal from '../../components/Modal/Modal'
import clsx from 'clsx'

const statusLabels = {
  Online: { label: 'Online', color: 'badge-success' },
  Offline: { label: 'Offline', color: 'badge-gray' },
  Maintenance: { label: 'Manutenção', color: 'badge-warning' },
  Error: { label: 'Erro', color: 'badge-error' },
}

const provisioningLabels = {
  PendingInstall: { label: 'Pendente', color: 'badge-warning' },
  Installing: { label: 'Instalando…', color: 'badge-info' },
  Ready: { label: 'Pronto', color: 'badge-success' },
  Error: { label: 'Erro no setup', color: 'badge-error' },
}

const kindLabels = {
  LinuxUbuntu: 'Linux Ubuntu',
}

/**
 * Badge "Online" no front: usa hosts.Status (PUT do monitor) e, em fallback, o estado do peer VPN
 * (ReachableViaVpn / ping + handshake), que pode estar atualizado mesmo se o PUT do host falhou.
 */
function resolveHostStatusKey(h) {
  const s = h?.status
  if (s === 'Maintenance' || s === 'Error') return s
  if (s === 'Online') return 'Online'
  if (h?.vpnPeerReachableViaVpn === true) return 'Online'
  if (h?.vpnPeerPingSuccess === true && h?.vpnPeerLastHandshake) return 'Online'
  return 'Offline'
}

function parseMetrics(metricsJson) {
  if (!metricsJson) return null
  try { return JSON.parse(metricsJson) } catch { return null }
}

function formatSshSessionDuration(ms) {
  if (ms < 0 || Number.isNaN(ms)) return '—'
  const sTotal = Math.floor(ms / 1000)
  const d = Math.floor(sTotal / 86400)
  const h = Math.floor((sTotal % 86400) / 3600)
  const m = Math.floor((sTotal % 3600) / 60)
  const s = sTotal % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

/** Atualiza a cada 1s enquanto houver sessão aberta (relógio local; início vem da API). */
function HostInteractiveSshFooter({ host }) {
  const open = host.sshInteractiveSessionOpen === true
  const since = host.sshInteractiveSessionSince
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!open || !since) return undefined
    const id = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [open, since])

  const duration =
    open && since ? formatSshSessionDuration(Date.now() - new Date(since).getTime()) : null

  return (
    <div className="pt-3 mt-3 border-t border-gray-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="text-xs text-gray-600">Sessão SSH (console web)</div>
            {host.lastSshInteractiveReportAt && (
              <div className="text-[10px] text-gray-400 truncate">
                Dados do serviço hosts ·{' '}
                {new Date(host.lastSshInteractiveReportAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {open && duration ? (
            <>
              <span className="badge badge-success text-xs">Aberta</span>
              <div className="text-xs font-semibold text-gray-900 mt-1">há {duration}</div>
            </>
          ) : (
            <span className="text-xs text-gray-500">Nenhuma</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Hosts() {
  const navigate = useNavigate()
  const { data: hosts, isLoading, error, refetch, isFetching } = useHosts()
  const deleteHost = useDeleteHost()

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const [postCreateHost, setPostCreateHost] = useState(null)
  const [connectHost, setConnectHost] = useState(null)
  const [confirmReconnect, setConfirmReconnect] = useState(null)

  const filtered = (hosts || []).filter(
    (h) =>
      !search ||
      h.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.vpnIp?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remover o host "${name}"?`)) return
    try {
      await deleteHost.mutateAsync(id)
    } catch (err) {
      alert(err.message || 'Erro ao remover')
    }
  }

  const handleHostCreated = (createdHost) => {
    setPostCreateHost(createdHost)
  }

  const handleConnectNow = () => {
    const host = postCreateHost
    setPostCreateHost(null)
    setConnectHost(host)
  }

  const handleConnectLater = () => {
    setPostCreateHost(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando hosts…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Erro ao carregar hosts: {error.message}
          <button type="button" className="ml-2 underline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Server className="w-8 h-8" />
            Hosts
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Servidores Linux gerenciados via VPN e SSH
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && (
            <div className="flex items-center gap-2 text-xs text-blue-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>Atualizando…</span>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2"
            onClick={() => {
              setSelected(null)
              setModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Novo host
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{hosts?.length || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Total</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">
            {hosts?.filter((h) => resolveHostStatusKey(h) === 'Online').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Online</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-600">
            {hosts?.filter((h) => resolveHostStatusKey(h) === 'Offline').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Offline</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-amber-600">
            {hosts?.filter((h) => h.provisioningStatus === 'PendingInstall').length || 0}
          </div>
          <div className="text-sm text-gray-600 mt-1">Pendentes</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por nome ou IP…"
          className="input w-full pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum host encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {search ? 'Tente ajustar sua busca' : 'Comece adicionando seu primeiro host'}
          </p>
          {!search && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelected(null)
                setModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Novo host
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((h) => {
            const statusKey = resolveHostStatusKey(h)
            const st = statusLabels[statusKey] || statusLabels.Offline
            const prov = provisioningLabels[h.provisioningStatus]
            const metrics = parseMetrics(h.metricsJson)

            return (
              <div
                key={h.id}
                className="card p-6 cursor-pointer border-2 border-transparent hover:border-primary-500 transition-colors"
                onClick={() => navigate(`/hosts/${h.id}/management`)}
              >
                <div className="flex gap-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg shrink-0 self-start">
                    <Server className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{h.name}</h3>
                      <span className={clsx('badge text-xs shrink-0', st.color)}>
                        {st.label}
                      </span>
                      {prov && h.provisioningStatus !== 'Ready' && (
                        <span className={clsx('badge text-xs shrink-0', prov.color)}>
                          {prov.label}
                        </span>
                      )}
                    </div>

                    {h.vpnIp && (
                      <p className="text-xs text-gray-600 mt-1 font-mono">
                        IP na VPN:{' '}
                        <span className="text-primary-600 font-medium">{h.vpnIp}</span>
                      </p>
                    )}
                    {(typeof h.vpnPeerPingAvgTimeMs === 'number' ||
                      h.vpnPeerLastHandshake ||
                      typeof h.vpnPeerPingSuccess === 'boolean') && (
                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                        {typeof h.vpnPeerPingAvgTimeMs === 'number' && (
                          <p className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 shrink-0 text-primary-500" />
                            <span>
                              Latência (ICMP): {Math.round(h.vpnPeerPingAvgTimeMs)} ms
                              {typeof h.vpnPeerPingPacketLoss === 'number' && (
                                <span className="text-gray-400">
                                  {' '}
                                  · perda {Math.round(h.vpnPeerPingPacketLoss)}%
                                </span>
                              )}
                            </span>
                          </p>
                        )}
                        {typeof h.vpnPeerPingSuccess === 'boolean' && (
                          <p className="text-gray-400">
                            Ping VPN: {h.vpnPeerPingSuccess ? 'OK' : 'falhou'}
                          </p>
                        )}
                        {h.vpnPeerLastHandshake && (
                          <p className="text-gray-400">
                            Handshake:{' '}
                            {new Date(h.vpnPeerLastHandshake).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {kindLabels[h.hostKind] || h.hostKind} · SSH :{h.sshPort}
                    </p>

                    {h.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (h.provisioningStatus === 'Ready' || h.provisioningStatus === 'Installing') {
                            setConfirmReconnect(h)
                          } else {
                            setConnectHost(h)
                          }
                        }}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                        title="Conectar-se"
                      >
                        <Plug className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/hosts/${h.id}/management`)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Console SSH"
                      >
                        <Terminal className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(h)
                          setModalOpen(true)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, h.id, h.name)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                        disabled={deleteHost.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info footer */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Última Atividade</div>
                    <div className="text-xs font-semibold text-gray-900">
                      {h.lastSeenAt
                        ? new Date(h.lastSeenAt).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : 'Nunca'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Provisionamento</div>
                    <div className="text-xs font-semibold text-gray-900">
                      {prov?.label || h.provisioningStatus}
                    </div>
                  </div>
                </div>

                <HostInteractiveSshFooter host={h} />

                {/* Metrics */}
                {metrics && (
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 mt-4">
                    {metrics.cpu !== undefined && (
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="text-xs text-gray-600">CPU</div>
                          <div className="text-sm font-semibold text-gray-900">{metrics.cpu}%</div>
                        </div>
                      </div>
                    )}
                    {metrics.memoryPercent !== undefined && (
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="text-xs text-gray-600">Mem</div>
                          <div className="text-sm font-semibold text-gray-900">{metrics.memoryPercent}%</div>
                        </div>
                      </div>
                    )}
                    {metrics.diskPercent !== undefined && (
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="text-xs text-gray-600">Disco</div>
                          <div className="text-sm font-semibold text-gray-900">{metrics.diskPercent}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      <HostModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelected(null)
        }}
        host={selected}
        onCreated={handleHostCreated}
      />

      {/* Modal pós-criação: "Deseja conectar-se agora?" */}
      <Modal
        isOpen={!!postCreateHost}
        onClose={handleConnectLater}
        title="Host criado com sucesso!"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            O host <strong>{postCreateHost?.name}</strong> foi criado. Deseja conectá-lo agora?
          </p>
          <p className="text-sm text-gray-500">
            Será gerado um comando para executar no servidor que instala e configura tudo automaticamente (VPN, SSH e usuário).
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" className="btn btn-ghost" onClick={handleConnectLater}>
              Depois
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConnectNow}>
              <Plug className="w-4 h-4" />
              Conectar agora
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar reconexão (host já provisionado) */}
      <Modal
        isOpen={!!confirmReconnect}
        onClose={() => setConfirmReconnect(null)}
        title="Reconectar host"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-900 font-medium">
                O host <strong>{confirmReconnect?.name}</strong> já está {confirmReconnect?.provisioningStatus === 'Ready' ? 'conectado e provisionado' : 'em instalação'}.
              </p>
              <p className="text-sm text-amber-800 mt-2">
                Ao continuar, <strong>novas chaves VPN e SSH serão geradas</strong>. O acesso atual ao host será perdido até que o novo script seja executado no servidor.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmReconnect(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500"
              onClick={() => {
                const host = confirmReconnect
                setConfirmReconnect(null)
                setConnectHost(host)
              }}
            >
              <Plug className="w-4 h-4" />
              Reconectar mesmo assim
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal conectar host */}
      <ConnectHostModal
        isOpen={!!connectHost}
        onClose={() => setConnectHost(null)}
        host={connectHost}
      />
    </div>
  )
}

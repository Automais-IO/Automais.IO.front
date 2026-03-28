import {
  Cpu,
  Plus,
  Search,
  Filter,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Power,
  RefreshCw,
  Trash2,
  Radio,
  Upload,
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { openDeviceWebUiWindow } from '../../utils/openDeviceWebUiWindow'
import { useApplications } from '../../hooks/useApplications'
import {
  useDevices,
  useDeleteDevice,
  useDisableWebDevice,
  useEnableWebDevice,
  useRegenerateWebDeviceToken,
  useRequestWebDeviceSync,
} from '../../hooks/useDevices'
import DeviceModal from '../../components/Modal/DeviceModal'

const kindLabels = {
  1: 'LoRaWAN',
  2: 'MQTT',
  3: 'Custom API',
  LoRaWan: 'LoRaWAN',
  Mqtt: 'MQTT',
  CustomApi: 'Custom API',
}

const statusLabels = {
  0: { label: '—', color: 'badge-gray' },
  NeverSeen: { label: '—', color: 'badge-gray' },
  1: { label: 'Provisionamento', color: 'badge-gray' },
  2: { label: 'Ativo', color: 'badge-success' },
  3: { label: 'Atenção', color: 'badge-warning' },
  4: { label: 'Offline', color: 'badge-error' },
  5: { label: 'Desativado', color: 'badge-gray' },
  Provisioning: { label: 'Provisionamento', color: 'badge-gray' },
  Active: { label: 'Ativo', color: 'badge-success' },
  Warning: { label: 'Atenção', color: 'badge-warning' },
  Offline: { label: 'Offline', color: 'badge-error' },
  Decommissioned: { label: 'Desativado', color: 'badge-gray' },
}

function kindLabel(k) {
  return kindLabels[k] ?? (k != null ? String(k) : '—')
}

function statusBadge(status) {
  const s = statusLabels[status] ?? { label: String(status ?? '—'), color: 'badge-gray' }
  return <span className={clsx('badge', s.color)}>{s.label}</span>
}

function pick(device, camel, snake) {
  if (device[camel] !== undefined && device[camel] !== null) return device[camel]
  if (snake && device[snake] !== undefined && device[snake] !== null) return device[snake]
  return device[camel] ?? (snake ? device[snake] : undefined)
}

function syncProgressParts(device) {
  const dd = pick(device, 'webDeviceDownloadDone', 'web_device_download_done')
  const dt = pick(device, 'webDeviceDownloadTotal', 'web_device_download_total')
  if (dd != null && dt != null && dt > 0) return { cur: dd, total: dt, kind: 'files' }
  const sc = pick(device, 'webDeviceSyncedFileCount', 'web_device_synced_file_count')
  const tc = pick(device, 'webDeviceTotalFileCount', 'web_device_total_file_count')
  if (sc != null && tc != null && tc > 0) return { cur: sc, total: tc, kind: 'manifest' }
  return null
}

/** Estado exibido na coluna Nuvem (túnel + sync + telemetria do ESP, vinda da API + serviço webdevice). */
function buildWebCloudUi(device) {
  const wdOn = pick(device, 'webDeviceEnabled', 'web_device_enabled')
  const wdTok = pick(device, 'webDeviceTokenConfigured', 'web_device_token_configured')
  if (!wdOn) {
    return {
      badges: [{ label: 'Remota off', color: 'badge-gray' }],
      detailLines: [],
      hint: 'Ative a interface remota para gerar token e sincronizar arquivos com o servidor.',
    }
  }
  if (!wdTok) {
    return {
      badges: [{ label: 'Token pendente', color: 'badge-warning' }],
      detailLines: [],
      hint: 'Conclua a habilitação e configure o token no firmware (/device → Cloud).',
    }
  }

  const tunnel = pick(device, 'webDeviceTunnelOnline', 'web_device_tunnel_online')
  const syncSt = String(pick(device, 'webDeviceSyncStatus', 'web_device_sync_status') || '')
  const st = syncSt.toLowerCase()
  const telemJson = pick(device, 'webDeviceTelemetryJson', 'web_device_telemetry_json')
  const telemAt = pick(device, 'webDeviceTelemetryReceivedAt', 'web_device_telemetry_received_at')

  const badges = []
  if (tunnel === true) badges.push({ label: 'Online', color: 'badge-success' })
  else if (tunnel === false) badges.push({ label: 'Offline', color: 'badge-gray' })
  else badges.push({ label: 'Estado indisponível', color: 'badge-warning' })

  if (tunnel === true) {
    if (st === 'done') badges.push({ label: 'Sincronizado', color: 'badge-success' })
    else if (st === 'syncing') badges.push({ label: 'Sincronizando', color: 'badge-info' })
    else if (st === 'requesting') badges.push({ label: 'Manifesto…', color: 'badge-info' })
    else if (st === 'error') badges.push({ label: 'Erro sync', color: 'badge-error' })
    else if (syncSt) badges.push({ label: syncSt, color: 'badge-gray' })
  }

  const detailLines = []
  const parts = syncProgressParts(device)
  if (parts) {
    detailLines.push(
      parts.kind === 'files'
        ? `Arquivos: ${parts.cur}/${parts.total}`
        : `Manifesto: ${parts.cur}/${parts.total}`
    )
  }

  let telem = null
  try {
    telem = telemJson ? JSON.parse(telemJson) : null
  } catch {
    telem = null
  }
  if (telem && typeof telem === 'object') {
    if (telem.free_heap != null)
      detailLines.push(`RAM livre: ~${Math.round(Number(telem.free_heap) / 1024)} KiB`)
    if (telem.heap_frag_pct != null) detailLines.push(`Frag. heap: ${telem.heap_frag_pct}%`)
    if (telem.littlefs_used != null && telem.littlefs_total != null) {
      detailLines.push(
        `LittleFS: ${Math.round(Number(telem.littlefs_used) / 1024)} / ${Math.round(Number(telem.littlefs_total) / 1024)} KiB`
      )
    }
    if (telem.wifi_rssi != null) detailLines.push(`RSSI Wi‑Fi: ${telem.wifi_rssi} dBm`)
    if (telem.lora_rssi != null) detailLines.push(`RSSI LoRa: ${telem.lora_rssi} dBm`)
  }
  if (telemAt) {
    detailLines.push(
      `Telemetria: ${new Date(telemAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`
    )
  }

  let hint = ''
  if (tunnel === true && st === 'done') {
    hint = 'Túnel ativo e cópia no servidor pronta — você pode abrir a UI.'
  } else if (tunnel === true) {
    hint = 'Aguarde o fim da sincronização de arquivos para abrir a interface web.'
  } else if (tunnel === false) {
    hint = 'Equipamento sem túnel ativo; verifique alimentação, Wi‑Fi e token.'
  } else {
    hint = 'Não foi possível consultar o serviço WebDevice (rede interna / Python).'
  }

  return { badges, detailLines, hint }
}

function canOpenWebUi(device) {
  const wdOn = pick(device, 'webDeviceEnabled', 'web_device_enabled')
  const wdTok = pick(device, 'webDeviceTokenConfigured', 'web_device_token_configured')
  const uiReady = pick(device, 'webDeviceUiReady', 'web_device_ui_ready')
  const tunnel = pick(device, 'webDeviceTunnelOnline', 'web_device_tunnel_online')
  const syncSt = String(pick(device, 'webDeviceSyncStatus', 'web_device_sync_status') || '').toLowerCase()
  if (!wdOn || !wdTok) return false
  if (uiReady === true) return true
  return tunnel === true && syncSt === 'done'
}

const iconAct =
  'p-2 rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed'

export default function Devices() {
  const { data: devices, isLoading, error, refetch, isFetching } = useDevices()
  const { data: applications } = useApplications()
  const enableWd = useEnableWebDevice()
  const regenWd = useRegenerateWebDeviceToken()
  const disableWd = useDisableWebDevice()
  const deleteDevice = useDeleteDevice()
  const requestSync = useRequestWebDeviceSync()

  const [searchTerm, setSearchTerm] = useState('')
  const [applicationFilter, setApplicationFilter] = useState('all')
  const [tokenDialog, setTokenDialog] = useState(null)
  const [deviceModalOpen, setDeviceModalOpen] = useState(false)

  const appNameById = Object.fromEntries(
    (applications ?? []).map((a) => [a.id, a.name])
  )

  const list = devices ?? []

  const filteredDevices = list.filter((device) => {
    const matchesSearch =
      device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.devEui?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(device.id).toLowerCase().includes(searchTerm.toLowerCase())
    const appId = device.applicationId ?? device.application_id
    const matchesApplication =
      applicationFilter === 'all' || String(appId) === applicationFilter
    return matchesSearch && matchesApplication
  })

  const stats = {
    total: list.length,
    webOn: list.filter((d) => d.webDeviceEnabled).length,
  }

  const runEnable = async (devEui) => {
    try {
      const res = await enableWd.mutateAsync(devEui)
      const tok = res.token ?? res.Token
      if (tok) setTokenDialog({ token: tok, message: res.message ?? res.Message })
      await refetch()
    } catch (e) {
      alert(e.message || 'Falha ao habilitar')
    }
  }

  const runRegen = async (id) => {
    if (!window.confirm('Regenerar invalida o token no firmware. Continuar?')) return
    try {
      const res = await regenWd.mutateAsync(id)
      const tok = res.token ?? res.Token
      if (tok) setTokenDialog({ token: tok, message: res.message ?? res.Message })
      await refetch()
    } catch (e) {
      alert(e.message || 'Falha ao regenerar')
    }
  }

  const runDisable = async (devEui) => {
    if (!window.confirm('Desabilitar o acesso remoto à interface deste device?')) return
    try {
      await disableWd.mutateAsync(devEui)
      await refetch()
    } catch (e) {
      alert(e.message || 'Falha ao desabilitar')
    }
  }

  const runRequestSync = async (devEui) => {
    try {
      await requestSync.mutateAsync(devEui)
      await refetch()
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.Message ||
        e.message ||
        'Não foi possível solicitar sincronização (agente offline?)'
      alert(msg)
    }
  }

  const runDelete = async (device) => {
    const id = device?.id
    if (!id) {
      alert('Device inválido para exclusão.')
      return
    }
    const devLabel = device?.name || device?.devEui || id
    if (!window.confirm(`Excluir o device "${devLabel}"? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteDevice.mutateAsync(id)
      await refetch()
    } catch (e) {
      alert(e.message || 'Falha ao excluir device')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando devices...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error.message}
        </div>
      </div>
    )
  }

  const canCreateDevice = (applications ?? []).length > 0

  return (
    <div className="space-y-6">
      <DeviceModal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        applications={applications ?? []}
      />

      {tokenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Token WebDevice</h3>
            <p className="text-sm text-gray-600">
              {tokenDialog.message ||
                'Guarde o token com segurança; ele não será exibido novamente. Configure-o no firmware (/device → Cloud).'}
            </p>
            <textarea
              readOnly
              className="w-full font-mono text-xs p-2 border rounded-md bg-gray-50"
              rows={4}
              value={tokenDialog.token}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  navigator.clipboard.writeText(tokenDialog.token)
                }}
              >
                Copiar
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setTokenDialog(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
            <p className="mt-1 text-sm text-gray-600">
              Dispositivos, túnel na nuvem e sincronização de arquivos (mesma fonte que o Automais Manager)
            </p>
          </div>
          <div
            className="flex items-center gap-2 text-xs text-gray-500"
            title="Lista e estado do túnel/telemetria: atualização a cada 60 s com a aba visível (menos carga no ESP)"
          >
            <Radio className="w-4 h-4 text-green-600 shrink-0" aria-hidden />
            <span>Atualização 60 s</span>
            {isFetching && !isLoading && (
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Atualizando…
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canCreateDevice}
          title={
            canCreateDevice
              ? 'Cadastrar novo device'
              : 'Crie uma Application antes de adicionar devices'
          }
          onClick={() => setDeviceModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Novo Device
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600 mt-1">Total</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">{stats.webOn}</div>
          <div className="text-sm text-gray-600 mt-1">Com interface remota (nuvem) ativa</div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, DevEUI ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 input"
          />
        </div>
        <select
          className="input w-56"
          value={applicationFilter}
          onChange={(e) => setApplicationFilter(e.target.value)}
        >
          <option value="all">Todas as applications</option>
          {(applications ?? []).map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
        <span className="text-gray-400">
          <Filter className="w-5 h-5" />
        </span>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="card p-12 text-center">
          <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || applicationFilter !== 'all'
              ? 'Nenhum device encontrado'
              : 'Nenhum device cadastrado'}
          </h3>
          {!searchTerm && applicationFilter === 'all' && canCreateDevice && (
            <button type="button" className="btn btn-primary mt-4" onClick={() => setDeviceModalOpen(true)}>
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
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Plataforma
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nuvem (túnel)
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredDevices.map((device) => {
                  const appId = device.applicationId ?? device.application_id
                  const devEui = device.devEui ?? device.dev_eui ?? ''
                  const wdDisabled = !String(devEui).trim()
                  const wdOn = device.webDeviceEnabled ?? device.web_device_enabled
                  const wdTok = device.webDeviceTokenConfigured ?? device.web_device_token_configured
                  const cloud = buildWebCloudUi(device)
                  const canOpenUi = canOpenWebUi(device)
                  const tunnelOn = pick(device, 'webDeviceTunnelOnline', 'web_device_tunnel_online') === true
                  const canForceSync = wdOn && wdTok && tunnelOn
                  return (
                    <tr key={device.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-100 rounded-lg">
                            <Cpu className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{device.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{device.devEui}</div>
                            <div className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]" title={device.id}>
                              {device.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {appNameById[appId] ?? '—'}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {kindLabel(device.kind)}
                      </td>
                      <td className="py-4 px-4">{statusBadge(device.status)}</td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {cloud.badges.map((b) => (
                            <span key={b.label} className={clsx('badge', b.color)}>
                              {b.label}
                            </span>
                          ))}
                        </div>
                        {cloud.detailLines.length > 0 && (
                          <ul className="text-[11px] text-gray-600 mt-1.5 space-y-0.5 leading-snug list-disc pl-3.5">
                            {cloud.detailLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                        {cloud.hint && (
                          <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{cloud.hint}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex flex-wrap gap-0.5 justify-end">
                          {!wdOn ? (
                            <button
                              type="button"
                              className={clsx(iconAct, 'hover:bg-green-50')}
                              disabled={enableWd.isPending || wdDisabled}
                              title={
                                wdDisabled ? 'Device sem DevEUI' : 'Habilitar interface na nuvem'
                              }
                              onClick={() => runEnable(devEui)}
                            >
                              <KeyRound className="w-4 h-4 text-green-600" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={clsx(iconAct, 'hover:bg-gray-100')}
                                disabled={regenWd.isPending || wdDisabled}
                                title="Gerar novo token (invalida o firmware atual)"
                                onClick={() => runRegen(devEui)}
                              >
                                <RefreshCw className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                type="button"
                                className={clsx(iconAct, 'hover:bg-violet-50')}
                                disabled={!canForceSync || requestSync.isPending || wdDisabled}
                                title={
                                  canForceSync
                                    ? 'Forçar nova sincronização de arquivos /data'
                                    : 'Só com túnel online'
                                }
                                onClick={() => runRequestSync(devEui)}
                              >
                                <Upload className="w-4 h-4 text-violet-600" />
                              </button>
                              <button
                                type="button"
                                className={clsx(iconAct, 'hover:bg-amber-50')}
                                disabled={disableWd.isPending || wdDisabled}
                                title="Desligar interface remota na nuvem"
                                onClick={() => runDisable(devEui)}
                              >
                                <Power className="w-4 h-4 text-amber-700" />
                              </button>
                              <button
                                type="button"
                                className={clsx(iconAct, 'hover:bg-sky-50')}
                                disabled={!canOpenUi}
                                title={
                                  canOpenUi
                                    ? 'Abrir UI do device (túnel + sync concluído)'
                                    : 'Disponível só com equipamento online e sincronizado'
                                }
                                onClick={() => {
                                  if (!openDeviceWebUiWindow(devEui)) {
                                    window.alert(
                                      'Não foi possível abrir a janela da UI. Permita pop-ups para este site e tente de novo.'
                                    )
                                  }
                                }}
                              >
                                <ExternalLink className="w-4 h-4 text-sky-600" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className={clsx(iconAct, 'hover:bg-red-50')}
                            disabled={deleteDevice.isPending}
                            title="Excluir device"
                            onClick={() => runDelete(device)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

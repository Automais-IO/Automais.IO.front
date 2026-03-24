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
} from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApplications } from '../../hooks/useApplications'
import {
  useDevices,
  useDisableWebDevice,
  useEnableWebDevice,
  useRegenerateWebDeviceToken,
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
  return (
    <span className={clsx('badge', s.color)}>{s.label}</span>
  )
}

export default function Devices() {
  const { data: devices, isLoading, error, refetch } = useDevices()
  const { data: applications } = useApplications()
  const enableWd = useEnableWebDevice()
  const regenWd = useRegenerateWebDeviceToken()
  const disableWd = useDisableWebDevice()

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

  const runEnable = async (id) => {
    try {
      const res = await enableWd.mutateAsync(id)
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

  const runDisable = async (id) => {
    if (!window.confirm('Desabilitar o acesso remoto à interface deste device?')) return
    try {
      await disableWd.mutateAsync(id)
      await refetch()
    } catch (e) {
      alert(e.message || 'Falha ao desabilitar')
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie dispositivos e o acesso remoto à interface web (túnel na nuvem)
          </p>
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
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nuvem UI
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredDevices.map((device) => {
                  const appId = device.applicationId ?? device.application_id
                  const wdOn = device.webDeviceEnabled ?? device.web_device_enabled
                  const wdTok = device.webDeviceTokenConfigured ?? device.web_device_token_configured
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
                      <td className="py-4 px-4">
                        <div className="text-xs space-y-1">
                          <span className={clsx('badge', wdOn ? 'badge-success' : 'badge-gray')}>
                            {wdOn ? 'Ativo' : 'Off'}
                          </span>
                          {wdOn && (
                            <div className="text-gray-500">
                              Token: {wdTok ? 'configurado' : 'pendente'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {!wdOn ? (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              disabled={enableWd.isPending}
                              onClick={() => runEnable(device.id)}
                            >
                              <KeyRound className="w-3 h-3 mr-1" />
                              Habilitar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                disabled={regenWd.isPending}
                                onClick={() => runRegen(device.id)}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Novo token
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline text-red-700 border-red-200"
                                disabled={disableWd.isPending}
                                onClick={() => runDisable(device.id)}
                              >
                                <Power className="w-3 h-3 mr-1" />
                                Desligar
                              </button>
                              <Link
                                to={`/devices/${device.id}/web-ui/`}
                                className="btn btn-sm btn-primary inline-flex items-center"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Abrir UI
                              </Link>
                            </>
                          )}
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

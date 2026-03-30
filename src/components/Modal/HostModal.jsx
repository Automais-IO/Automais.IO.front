import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useCreateHost, useUpdateHost } from '../../hooks/useHosts'
import { vpnNetworksApi } from '../../services/vpnNetworksApi'
import { getTenantId } from '../../config/tenant'

const HOST_KINDS = [
  { value: 'LinuxUbuntu', label: 'Linux Ubuntu' },
  { value: 'Windows', label: 'Windows' },
]

const formatInstallationCode = (digits) => {
  const cleaned = (digits || '').replace(/\D/g, '').slice(0, 9)
  const parts = cleaned.match(/.{1,3}/g)
  return parts ? parts.join(' ') : ''
}

export default function HostModal({ isOpen, onClose, host = null, onCreated }) {
  const isEditing = !!host
  const createHost = useCreateHost()
  const updateHost = useUpdateHost()

  const [formData, setFormData] = useState({
    name: '',
    hostKind: 'LinuxUbuntu',
    vpnNetworkId: '',
    installationCode: '',
    sshPort: 22,
    remoteDisplayPort: 5900,
    remoteDisplayEnabled: true,
    remoteDisplayUseBootstrapCredentials: true,
    description: '',
  })
  const [errors, setErrors] = useState({})
  const [vpnNetworks, setVpnNetworks] = useState([])
  const [loadingVpn, setLoadingVpn] = useState(false)

  useEffect(() => {
    if (host) {
      setFormData({
        name: host.name || '',
        hostKind: host.hostKind || 'LinuxUbuntu',
        vpnNetworkId: host.vpnNetworkId ? String(host.vpnNetworkId) : '',
        installationCode: '',
        sshPort: host.sshPort ?? 22,
        remoteDisplayPort: host.remoteDisplayPort ?? 5900,
        remoteDisplayEnabled: host.remoteDisplayEnabled !== false,
        remoteDisplayUseBootstrapCredentials: host.remoteDisplayUseBootstrapCredentials !== false,
        description: host.description || '',
      })
    } else {
      setFormData({
        name: '',
        hostKind: 'LinuxUbuntu',
        vpnNetworkId: '',
        installationCode: '',
        sshPort: 22,
        remoteDisplayPort: 5900,
        remoteDisplayEnabled: true,
        remoteDisplayUseBootstrapCredentials: true,
        description: '',
      })
    }
    setErrors({})
  }, [host, isOpen])

  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        setLoadingVpn(true)
        const tid = getTenantId()
        if (tid) {
          const nets = await vpnNetworksApi.getByTenant(tid)
          setVpnNetworks(nets || [])
        }
      } catch (e) {
        console.error(e)
        setVpnNetworks([])
      } finally {
        setLoadingVpn(false)
      }
    })()
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === 'installationCode') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 9)
      setFormData((prev) => ({
        ...prev,
        installationCode: digitsOnly,
      }))
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
      return
    }

    const raw =
      type === 'checkbox'
        ? checked
        : name === 'sshPort'
          ? value === ''
            ? ''
            : parseInt(value, 10) || 22
          : value
    setFormData((prev) => ({
      ...prev,
      [name]: raw,
    }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!formData.name?.trim()) next.name = 'Nome obrigatório'
    if (!formData.vpnNetworkId) next.vpnNetworkId = 'Rede VPN obrigatória'
    if (!isEditing && formData.hostKind === 'Windows' && !formData.installationCode?.trim()) {
      next.installationCode = 'Código de instalação obrigatório para host Windows'
    }
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    const payload = {
      name: formData.name.trim(),
      hostKind: formData.hostKind,
      vpnNetworkId: formData.vpnNetworkId,
      installationCode:
        formData.hostKind === 'Windows' ? formData.installationCode.trim() : null,
      sshPort: Number(formData.sshPort) || 22,
      remoteDisplayPort: Number(formData.remoteDisplayPort) || 5900,
      remoteDisplayEnabled: Boolean(formData.remoteDisplayEnabled),
      remoteDisplayUseBootstrapCredentials: Boolean(formData.remoteDisplayUseBootstrapCredentials),
      description: formData.description?.trim() || null,
    }

    try {
      if (isEditing) {
        await updateHost.mutateAsync({ id: host.id, data: payload })
        onClose()
      } else {
        const created = await createHost.mutateAsync(payload)
        onClose()
        if (onCreated) onCreated(created)
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Erro ao salvar')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar host' : 'Novo host'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="label">Nome *</label>
          <input
            name="name"
            className="input w-full"
            value={formData.name}
            onChange={handleChange}
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Rede VPN *</label>
          <select
            name="vpnNetworkId"
            className="input w-full"
            value={formData.vpnNetworkId}
            onChange={handleChange}
            disabled={loadingVpn}
          >
            <option value="">Selecione uma rede VPN</option>
            {vpnNetworks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.cidr})
              </option>
            ))}
          </select>
          {errors.vpnNetworkId && (
            <p className="text-sm text-red-600 mt-1">{errors.vpnNetworkId}</p>
          )}
        </div>

        <div>
          <label className="label">Tipo *</label>
          <select
            name="hostKind"
            className="input w-full"
            value={formData.hostKind}
            onChange={handleChange}
          >
            {HOST_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        {formData.hostKind === 'Windows' && (
          <div>
            <label className="label">Código de instalação (agente) *</label>
            <input
              name="installationCode"
              className="input w-full"
              value={formatInstallationCode(formData.installationCode)}
              onChange={handleChange}
              placeholder="Ex.: 123456789"
            />
            <p className="text-xs text-gray-500 mt-1">
              Instale o Automais.IO.remote no Windows e informe o código exibido no agente.
            </p>
            {errors.installationCode && (
              <p className="text-sm text-red-600 mt-1">{errors.installationCode}</p>
            )}
          </div>
        )}

        <div>
          <label className="label">Porta SSH *</label>
          <input
            name="sshPort"
            type="number"
            min={1}
            max={65535}
            className="input w-full"
            value={formData.sshPort}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="label">Porta display remoto (VNC)</label>
          <input
            name="remoteDisplayPort"
            type="number"
            min={1}
            max={65535}
            className="input w-full"
            value={formData.remoteDisplayPort}
            onChange={handleChange}
            disabled={!formData.remoteDisplayEnabled}
          />
          <p className="text-xs text-gray-500 mt-1">
            Servidor VNC no host (ex.: 5900). Só usado se a opção abaixo estiver ativa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="remoteDisplayEnabled"
            name="remoteDisplayEnabled"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300"
            checked={formData.remoteDisplayEnabled}
            onChange={handleChange}
          />
          <label htmlFor="remoteDisplayEnabled" className="text-sm cursor-pointer">
            Permitir display remoto no painel (VNC)
          </label>
        </div>

        <div className="flex items-start gap-2">
          <input
            id="remoteDisplayUseBootstrapCredentials"
            name="remoteDisplayUseBootstrapCredentials"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 mt-0.5"
            checked={formData.remoteDisplayUseBootstrapCredentials}
            onChange={handleChange}
            disabled={!formData.remoteDisplayEnabled}
          />
          <label htmlFor="remoteDisplayUseBootstrapCredentials" className="text-sm cursor-pointer leading-snug">
            Enviar automaticamente utilizador/senha do bootstrap (SSH) ao abrir o VNC
            <span className="block text-xs text-gray-500 font-normal mt-1">
              Desative se o VNC usar outro utilizador (ex.: pi) ou senha própria — caso contrário o servidor pode
              responder &quot;Access is denied&quot;.
            </span>
          </label>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea
            name="description"
            className="input w-full min-h-[80px]"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createHost.isPending || updateHost.isPending}
          >
            {createHost.isPending || updateHost.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

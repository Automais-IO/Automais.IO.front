import { useState, useEffect } from 'react'
import Modal from './Modal'
import { useCreateHost, useUpdateHost } from '../../hooks/useHosts'
import { vpnNetworksApi } from '../../services/vpnNetworksApi'
import { getTenantId } from '../../config/tenant'

const HOST_KINDS = [{ value: 'LinuxUbuntu', label: 'Linux Ubuntu' }]

export default function HostModal({ isOpen, onClose, host = null, onCreated }) {
  const isEditing = !!host
  const createHost = useCreateHost()
  const updateHost = useUpdateHost()

  const [formData, setFormData] = useState({
    name: '',
    hostKind: 'LinuxUbuntu',
    vpnNetworkId: '',
    sshPort: 22,
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
        sshPort: host.sshPort ?? 22,
        description: host.description || '',
      })
    } else {
      setFormData({
        name: '',
        hostKind: 'LinuxUbuntu',
        vpnNetworkId: '',
        sshPort: 22,
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
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sshPort' ? (value === '' ? '' : parseInt(value, 10) || 22) : value,
    }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!formData.name?.trim()) next.name = 'Nome obrigatório'
    if (!formData.vpnNetworkId) next.vpnNetworkId = 'Rede VPN obrigatória'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    const payload = {
      name: formData.name.trim(),
      hostKind: formData.hostKind,
      vpnNetworkId: formData.vpnNetworkId,
      sshPort: Number(formData.sshPort) || 22,
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

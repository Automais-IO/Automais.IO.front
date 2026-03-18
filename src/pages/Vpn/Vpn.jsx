import { useState, useEffect } from 'react'
import { Plus, Network, Edit, Trash2, Shield, Search, KeyRound } from 'lucide-react'
import { vpnNetworksApi } from '../../services/vpnNetworksApi'
import { getTenantId } from '../../config/tenant'
import Modal from '../../components/Modal/Modal'

function normalizeVpnEndpoint(s) {
  return (s || '').trim().toLowerCase()
}

/** Portas já usadas no mesmo endpoint por outras redes (exclui networkId se edição) */
function getConflictingNetwork(networks, endpoint, port, excludeId) {
  const ep = normalizeVpnEndpoint(endpoint)
  const p = Number(port)
  if (!ep || !Number.isFinite(p)) return null
  return networks.find(
    (n) =>
      normalizeVpnEndpoint(n.serverEndpoint) === ep &&
      Number(n.listenPort) === p &&
      n.id !== excludeId
  ) || null
}

export default function Vpn() {
  const [networks, setNetworks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    cidr: '',
    description: '',
    dnsServers: '',
    serverEndpoint: 'automais.io',
    listenPort: '',
    isDefault: false,
  })
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [renewConfirmTarget, setRenewConfirmTarget] = useState(null)
  const [renewResult, setRenewResult] = useState(null)

  useEffect(() => {
    loadNetworks()
  }, [])

  const loadNetworks = async () => {
    try {
      setLoading(true)
      const tenantId = getTenantId()
      const data = await vpnNetworksApi.getByTenant(tenantId)
      setNetworks(data)
    } catch (error) {
      console.error('Erro ao carregar redes VPN:', error)
      alert('Erro ao carregar redes VPN: ' + (error.message || 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (network = null) => {
    setFormError('')
    setSelectedNetwork(network)
    if (network) {
      const lp = network.listenPort != null && network.listenPort > 0 ? String(network.listenPort) : '51820'
      setFormData({
        name: network.name || '',
        slug: network.slug || '',
        cidr: network.cidr || '',
        description: network.description || '',
        dnsServers: network.dnsServers || '',
        serverEndpoint: network.serverEndpoint || 'automais.io',
        listenPort: lp,
        isDefault: network.isDefault || false,
      })
    } else {
      setFormData({
        name: '',
        slug: '',
        cidr: '',
        description: '',
        dnsServers: '',
        serverEndpoint: 'automais.io',
        listenPort: '',
        isDefault: false,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedNetwork(null)
    setFormError('')
    setFormData({
      name: '',
      slug: '',
      cidr: '',
      description: '',
      dnsServers: '',
      serverEndpoint: 'automais.io',
      listenPort: '',
      isDefault: false,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    const tenantId = getTenantId()
    const endpoint = (formData.serverEndpoint || '').trim() || 'automais.io'

    if (selectedNetwork) {
      const port = parseInt(String(formData.listenPort).trim(), 10)
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        setFormError('Porta UDP deve ser um número entre 1 e 65535.')
        return
      }
      const conflict = getConflictingNetwork(networks, endpoint, port, selectedNetwork.id)
      if (conflict) {
        setFormError(
          `A porta ${port} já está em uso pela rede "${conflict.name}" no mesmo endpoint. Escolha outra porta ou altere o endpoint.`
        )
        return
      }
      try {
        await vpnNetworksApi.update(selectedNetwork.id, {
          name: formData.name,
          description: formData.description,
          dnsServers: formData.dnsServers,
          serverEndpoint: endpoint,
          isDefault: formData.isDefault,
          listenPort: port,
        })
        handleCloseModal()
        loadNetworks()
      } catch (error) {
        console.error('Erro ao salvar rede VPN:', error)
        const msg = error.response?.data?.message || error.message || 'Erro desconhecido'
        setFormError(msg)
      }
      return
    }

    const createPayload = {
      name: formData.name,
      slug: formData.slug,
      cidr: formData.cidr,
      description: formData.description || undefined,
      dnsServers: formData.dnsServers || undefined,
      serverEndpoint: endpoint,
      isDefault: formData.isDefault,
    }
    const portStr = String(formData.listenPort || '').trim()
    if (portStr !== '') {
      const port = parseInt(portStr, 10)
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        setFormError('Porta UDP deve ser um número entre 1 e 65535.')
        return
      }
      const conflict = getConflictingNetwork(networks, endpoint, port, null)
      if (conflict) {
        setFormError(
          `A porta ${port} já está em uso pela rede "${conflict.name}" no mesmo endpoint. Escolha outra porta ou deixe em branco para alocação automática.`
        )
        return
      }
      createPayload.listenPort = port
    }

    try {
      await vpnNetworksApi.create(tenantId, createPayload)
      handleCloseModal()
      loadNetworks()
    } catch (error) {
      console.error('Erro ao salvar rede VPN:', error)
      const msg = error.response?.data?.message || error.message || 'Erro desconhecido'
      setFormError(msg)
    }
  }

  const openRenewConfirm = (e, network) => {
    e?.stopPropagation?.()
    setRenewConfirmTarget(network)
  }

  const closeRenewConfirm = () => setRenewConfirmTarget(null)

  const handleConfirmRegenerateServerKeys = async () => {
    if (!renewConfirmTarget) return
    const network = renewConfirmTarget
    setRenewConfirmTarget(null)
    try {
      await vpnNetworksApi.regenerateServerKeys(network.id)
      await loadNetworks()
      setRenewResult({
        success: true,
        message: 'Chaves do servidor renovadas. Baixe novamente a config VPN em cada router e aguarde o sync no servidor VPN.'
      })
    } catch (error) {
      console.error(error)
      setRenewResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Erro ao renovar chaves do servidor'
      })
    }
  }

  const handleDelete = async (networkId) => {
    if (!confirm('Tem certeza que deseja excluir esta rede VPN?')) {
      return
    }
    try {
      await vpnNetworksApi.delete(networkId)
      loadNetworks()
    } catch (error) {
      console.error('Erro ao excluir rede VPN:', error)
      alert('Erro ao excluir rede VPN: ' + (error.response?.data?.message || error.message || 'Erro desconhecido'))
    }
  }

  const filteredNetworks = networks.filter((network) => {
    const q = searchTerm.toLowerCase()
    return (
      network.name.toLowerCase().includes(q) ||
      network.cidr.toLowerCase().includes(q) ||
      (network.slug && network.slug.toLowerCase().includes(q)) ||
      String(network.listenPort || '').includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando redes VPN...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">VPN</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gerencie as redes VPN para seus routers
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nova Rede VPN
        </button>
      </div>

      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar redes VPN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 input"
        />
      </div>

      {/* Networks List */}
      {filteredNetworks.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Nenhuma rede VPN encontrada' : 'Nenhuma rede VPN encontrada'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Tente ajustar os termos de busca.'
              : 'Crie sua primeira rede VPN para começar a usar VPN com seus routers.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Rede VPN
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNetworks.map((network) => (
            <div key={network.id} className="card p-6">
              <div className="flex gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg shrink-0 self-start">
                  <Network className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{network.name}</h3>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      {network.isDefault && (
                        <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded">
                          Padrão
                        </span>
                      )}
                      {!network.serverKeysConfigured && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                          Sem chaves do servidor
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => openRenewConfirm(e, network)}
                        className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Renovar chaves do servidor"
                      >
                        <KeyRound className="w-4 h-4 text-amber-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(network)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(network.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">CIDR:</span>{' '}
                  <span className="font-mono font-medium text-gray-900">{network.cidr}</span>
                </div>
                {network.slug && (
                  <div>
                    <span className="text-gray-600">Slug:</span>{' '}
                    <span className="font-mono text-gray-900">{network.slug}</span>
                  </div>
                )}
                {network.dnsServers && (
                  <div>
                    <span className="text-gray-600">DNS:</span>{' '}
                    <span className="text-gray-900">{network.dnsServers}</span>
                  </div>
                )}
                {network.serverEndpoint && (
                  <div>
                    <span className="text-gray-600">Endpoint:</span>{' '}
                    <span className="font-mono text-gray-900">{network.serverEndpoint}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Porta UDP (WireGuard):</span>{' '}
                  <span className="font-mono font-medium text-primary-700">
                    {network.listenPort != null && network.listenPort > 0 ? network.listenPort : 51820}
                  </span>
                </div>
                {network.description && (
                  <div className="text-gray-600 text-xs mt-2">
                    {network.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedNetwork ? 'Editar Rede VPN' : 'Nova Rede VPN'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="Ex: Rede Principal"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="input w-full"
              placeholder="Ex: rede-principal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CIDR <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.cidr}
              onChange={(e) => setFormData({ ...formData, cidr: e.target.value })}
              className="input w-full font-mono"
              placeholder="Ex: 10.100.1.0/24"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Formato: IP/prefixo (ex: 10.100.1.0/24)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Servidores DNS
            </label>
            <input
              type="text"
              value={formData.dnsServers}
              onChange={(e) => setFormData({ ...formData, dnsServers: e.target.value })}
              className="input w-full"
              placeholder="Ex: 8.8.8.8, 8.8.4.4"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separe múltiplos DNS por vírgula
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint do Servidor VPN
            </label>
            <input
              type="text"
              value={formData.serverEndpoint}
              onChange={(e) => setFormData({ ...formData, serverEndpoint: e.target.value })}
              className="input w-full font-mono"
              placeholder="automais.io"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Endpoint do servidor WireGuard (ex: automais.io). Este valor será usado nos arquivos .conf gerados.
            </p>
          </div>

          {selectedNetwork ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta UDP (WireGuard) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={65535}
                value={formData.listenPort}
                onChange={(e) => setFormData({ ...formData, listenPort: e.target.value })}
                className="input w-full font-mono"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Deve ser única entre todas as redes VPN com o mesmo endpoint. A API também valida ao salvar.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta UDP (opcional)
              </label>
              <input
                type="number"
                min={1}
                max={65535}
                value={formData.listenPort}
                onChange={(e) => setFormData({ ...formData, listenPort: e.target.value })}
                className="input w-full font-mono"
                placeholder="Ex: 51821 — vazio = automática"
              />
              <p className="mt-1 text-xs text-gray-500">
                Se vazio, o servidor aloca a próxima porta livre (a partir de 51820) neste endpoint.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              rows="3"
              placeholder="Descrição opcional da rede VPN"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Rede padrão
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {selectedNetwork ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: confirmar renovar chaves do servidor */}
      <Modal
        isOpen={!!renewConfirmTarget}
        onClose={closeRenewConfirm}
        title="Renovar chaves do servidor WireGuard?"
      >
        {renewConfirmTarget && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Rede: <strong>{renewConfirmTarget.name}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Todos os routers desta rede precisarão baixar novamente o arquivo .conf. O túnel VPN ficará inoperante até atualizar cada router.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={closeRenewConfirm} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerateServerKeys}
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


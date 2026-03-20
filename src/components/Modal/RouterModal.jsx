import { useState, useEffect, useCallback } from 'react'
import Modal from './Modal'
import { useCreateRouter, useUpdateRouter } from '../../hooks/useRouters'
import { vpnNetworksApi } from '../../services/vpnNetworksApi'
import { routerStaticRoutesApi } from '../../services/routerStaticRoutesApi'
import { routerDestinationNetworksApi } from '../../services/routerDestinationNetworksApi'
import { getTenantId } from '../../config/tenant'
import { Plus, Edit, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
export default function RouterModal({ isOpen, onClose, router = null }) {
  const isEditing = !!router
  const createRouter = useCreateRouter()
  const updateRouter = useUpdateRouter()

  const [formData, setFormData] = useState({
    name: router?.name || '',
    vpnNetworkId: router?.vpnNetworkId || '',
    description: router?.description || '',
  })

  const [errors, setErrors] = useState({})
  const [vpnNetworks, setVpnNetworks] = useState([])
  const [loadingVpnNetworks, setLoadingVpnNetworks] = useState(false)
  
  // Estados para gerenciar rotas (apenas ao editar)
  const [routes, setRoutes] = useState([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [editingRoute, setEditingRoute] = useState(null) // null = não editando, {} = nova rota, {id: ...} = editando rota existente
  const [routeForm, setRouteForm] = useState({
    destination: '',
    gateway: '',
    distance: '1',
    scope: '30',
    routingTable: 'main',
    description: ''
  })
  const [routeErrors, setRouteErrors] = useState({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Estados para Redes Destino (apenas ao editar)
  const [destinationNetworks, setDestinationNetworks] = useState([])
  const [loadingDestinationNetworks, setLoadingDestinationNetworks] = useState(false)
  const [editingDestNetwork, setEditingDestNetwork] = useState(null) // null | {} (nova) | { id, ... } (editar)
  const [destNetworkForm, setDestNetworkForm] = useState({ networkCidr: '', description: '' })
  const [destNetworkErrors, setDestNetworkErrors] = useState({})

  // Definir loadRoutes ANTES dos useEffect que a usam (evita erro de inicialização)
  const loadRoutes = useCallback(async () => {
    if (!router?.id) return
    
    try {
      setLoadingRoutes(true)
      const routesData = await routerStaticRoutesApi.getByRouter(router.id)
      setRoutes(routesData || [])
    } catch (error) {
      console.error('Erro ao carregar rotas:', error)
      setRoutes([])
    } finally {
      setLoadingRoutes(false)
    }
  }, [router?.id])

  const loadDestinationNetworks = useCallback(async () => {
    if (!router?.id) return
    try {
      setLoadingDestinationNetworks(true)
      const data = await routerDestinationNetworksApi.getByRouter(router.id)
      setDestinationNetworks(data || [])
    } catch (error) {
      console.error('Erro ao carregar redes destino:', error)
      setDestinationNetworks([])
    } finally {
      setLoadingDestinationNetworks(false)
    }
  }, [router?.id])

  // Carregar redes VPN quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadVpnNetworks()
      // Carregar rotas e redes destino se estiver editando
      if (isEditing && router?.id) {
        loadRoutes()
        loadDestinationNetworks()
      }
    }
  }, [isOpen, isEditing, router?.id, loadRoutes, loadDestinationNetworks])

  // Polling automático para rotas com erro ou pendentes de remoção
  useEffect(() => {
    // Verificar se há rotas com Error ou PendingRemove
    const hasErrorOrPendingRemove = routes.some(
      route => route.status === 'Error' || route.status === 'PendingRemove'
    )

    // Se não houver rotas com erro ou o modal estiver fechado, não fazer polling
    if (!hasErrorOrPendingRemove || !isOpen || !isEditing || !router?.id) {
      return
    }

    // Configurar polling a cada 3 segundos
    const intervalId = setInterval(() => {
      loadRoutes()
    }, 3000)

    // Limpar intervalo quando componente desmontar ou condições mudarem
    return () => {
      clearInterval(intervalId)
    }
  }, [routes, isOpen, isEditing, router?.id, loadRoutes])

  // Atualizar formData quando o router mudar (ao editar)
  useEffect(() => {
    if (router) {
      setFormData({
        name: router.name || '',
        vpnNetworkId: router.vpnNetworkId ? String(router.vpnNetworkId) : '',
        description: router.description || '',
      })
    } else {
      setFormData({
        name: '',
        vpnNetworkId: '',
        description: '',
      })
    }
  }, [router])

  const loadVpnNetworks = async () => {
    try {
      setLoadingVpnNetworks(true)
      const tenantId = getTenantId()
      if (tenantId) {
        const networks = await vpnNetworksApi.getByTenant(tenantId)
        setVpnNetworks(networks)
      }
    } catch (error) {
      console.error('Erro ao carregar redes VPN:', error)
      setVpnNetworks([])
    } finally {
      setLoadingVpnNetworks(false)
    }
  }

  const handleRouteFormChange = (e) => {
    const { name, value } = e.target
    setRouteForm((prev) => ({ ...prev, [name]: value }))
    // Limpar erro do campo
    if (routeErrors[name]) {
      setRouteErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validateRoute = () => {
    const newErrors = {}
    if (!routeForm.destination.trim()) {
      newErrors.destination = 'Destino é obrigatório'
    }
    
    // Gateway é opcional - se fornecido, validar formato
    // Se vazio, RouterOS usará a interface VPN como gateway
    
    // Validar formato CIDR para destino
    if (routeForm.destination.trim() && !/^[\d.]+(\/\d+)?$/.test(routeForm.destination.trim())) {
      newErrors.destination = 'Destino deve estar no formato CIDR (ex: 192.168.1.0/24)'
    }
    
    // Validar IP para gateway (apenas se fornecido)
    if (routeForm.gateway.trim() && !/^[\d.]+$/.test(routeForm.gateway.trim())) {
      newErrors.gateway = 'Gateway deve ser um endereço IP válido'
    }
    
    setRouteErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddRoute = async () => {
    setEditingRoute({}) // Nova rota
    setRouteForm({
      destination: '',
      gateway: '',
      distance: '1',
      scope: '30',
      routingTable: 'main',
      description: ''
    })
    setRouteErrors({})
    setShowAdvanced(false)
  }

  const handleEditRoute = (route) => {
    setEditingRoute(route)
    setRouteForm({
      destination: route.destination || '',
      gateway: route.gateway || '',
      distance: route.distance?.toString() || '',
      scope: route.scope?.toString() || '',
      routingTable: route.routingTable || '',
      description: route.description || ''
    })
    setRouteErrors({})
  }

  const handleCancelEditRoute = () => {
    setEditingRoute(null)
    setRouteForm({
      destination: '',
      gateway: '',
      distance: '1',
      scope: '30',
      routingTable: 'main',
      description: ''
    })
    setRouteErrors({})
    setShowAdvanced(false)
  }

  const handleSaveRoute = async () => {
    if (!validateRoute() || !router?.id) return

    try {
      const routeData = {
        destination: routeForm.destination.trim(),
        gateway: routeForm.gateway.trim() || undefined, // Gateway opcional - se vazio, RouterOS detectará interface automaticamente
        // Interface não é enviada - RouterOS detectará automaticamente quando gateway estiver vazio
        distance: routeForm.distance ? parseInt(routeForm.distance) : undefined,
        scope: routeForm.scope ? parseInt(routeForm.scope) : undefined,
        routingTable: routeForm.routingTable.trim() || undefined,
        description: routeForm.description.trim() || undefined
      }

      let savedRoute
      if (editingRoute.id) {
        // Atualizar rota existente
        savedRoute = await routerStaticRoutesApi.update(router.id, editingRoute.id, routeData)
      } else {
        // Criar nova rota (já vem com status PendingAdd)
        savedRoute = await routerStaticRoutesApi.create(router.id, routeData)
      }

      // Aplicar rotas imediatamente após salvar
      // Isso vai chamar a API RouterOS para adicionar a rota
      try {
        const applyResult = await routerStaticRoutesApi.applyRoutes(router.id)
        console.log('Rotas aplicadas:', applyResult)
      } catch (applyError) {
        console.error('Erro ao aplicar rotas:', applyError)
        // Não bloquear o fluxo, apenas logar o erro
        // O status de erro será mostrado na lista
      }

      // Recarregar rotas para ver o status atualizado
      await loadRoutes()
      handleCancelEditRoute()
    } catch (error) {
      console.error('Erro ao salvar rota:', error)
      alert(error.response?.data?.message || error.message || 'Erro ao salvar rota')
    }
  }

  const handleDeleteRoute = async (routeId) => {
    if (!router?.id) return
    
    if (!window.confirm('Tem certeza que deseja excluir esta rota?')) {
      return
    }

    try {
      // Marcar rota como PendingRemove (ao invés de deletar diretamente)
      await routerStaticRoutesApi.batchUpdateStatus(router.id, {
        routesToAdd: [],
        routesToRemove: [routeId]
      })

      // Aplicar remoção imediatamente (chama API RouterOS para remover)
      try {
        const applyResult = await routerStaticRoutesApi.applyRoutes(router.id)
        console.log('Rotas aplicadas (remoção):', applyResult)
      } catch (applyError) {
        console.error('Erro ao aplicar remoção de rota:', applyError)
        // Não bloquear o fluxo, o status de erro será mostrado na lista
      }

      // Recarregar rotas (a rota será deletada do BD se aplicação for bem-sucedida)
      await loadRoutes()
    } catch (error) {
      console.error('Erro ao excluir rota:', error)
      alert(error.response?.data?.message || error.message || 'Erro ao excluir rota')
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'PendingAdd': { label: 'Pendente Adicionar', color: 'bg-yellow-100 text-yellow-800' },
      'PendingRemove': { label: 'Pendente Remover', color: 'bg-red-100 text-red-800' },
      'Applied': { label: 'Aplicada', color: 'bg-green-100 text-green-800' },
      'Error': { label: 'Erro', color: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) return

    try {
      const dataToSend = {
        name: formData.name,
        description: formData.description,
        vpnNetworkId: formData.vpnNetworkId || null,
      }
      if (isEditing) {
        dataToSend.routerOsApiUrl = ''
        await updateRouter.mutateAsync({
          id: router.id,
          data: dataToSend,
        })
      } else {
        await createRouter.mutateAsync(dataToSend)
      }
      onClose()
      setFormData({ name: '', vpnNetworkId: '', description: '' })
    } catch (error) {
      console.error('Erro ao salvar router:', error)
      alert(error.message || 'Erro ao salvar router')
    }
  }

  // --- Redes Destino ---
  const validateDestNetwork = () => {
    const err = {}
    if (!destNetworkForm.networkCidr.trim()) err.networkCidr = 'CIDR é obrigatório'
    else if (!/^[\d.]+(\/\d+)?$/.test(destNetworkForm.networkCidr.trim())) err.networkCidr = 'Use formato CIDR (ex: 192.168.1.0/24)'
    setDestNetworkErrors(err)
    return Object.keys(err).length === 0
  }

  const handleAddDestNetwork = () => {
    setEditingDestNetwork({})
    setDestNetworkForm({ networkCidr: '', description: '' })
    setDestNetworkErrors({})
  }

  const handleEditDestNetwork = (item) => {
    setEditingDestNetwork(item)
    setDestNetworkForm({
      networkCidr: item.networkCidr || '',
      description: item.description || '',
    })
    setDestNetworkErrors({})
  }

  const handleCancelEditDestNetwork = () => {
    setEditingDestNetwork(null)
    setDestNetworkForm({ networkCidr: '', description: '' })
    setDestNetworkErrors({})
  }

  const handleSaveDestNetwork = async () => {
    if (!validateDestNetwork() || !router?.id) return
    try {
      if (editingDestNetwork?.id) {
        await routerDestinationNetworksApi.update(router.id, editingDestNetwork.id, {
          networkCidr: destNetworkForm.networkCidr.trim(),
          description: destNetworkForm.description?.trim() || undefined,
        })
      } else {
        await routerDestinationNetworksApi.create(router.id, {
          networkCidr: destNetworkForm.networkCidr.trim(),
          description: destNetworkForm.description?.trim() || undefined,
        })
      }
      await loadDestinationNetworks()
      handleCancelEditDestNetwork()
    } catch (error) {
      console.error('Erro ao salvar rede destino:', error)
      alert(error.response?.data?.message || error.message || 'Erro ao salvar rede destino')
    }
  }

  const handleDeleteDestNetwork = async (id) => {
    if (!router?.id || !window.confirm('Remover esta rede destino?')) return
    try {
      await routerDestinationNetworksApi.delete(router.id, id)
      await loadDestinationNetworks()
    } catch (error) {
      console.error('Erro ao remover rede destino:', error)
      alert(error.response?.data?.message || error.message || 'Erro ao remover')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Router' : 'Adicionar Router'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
            placeholder="Ex: Router Matriz"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            🔐 Configuração VPN (Opcional)
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Para gerar o certificado VPN automaticamente, selecione uma rede VPN.
            Se deixar vazio, o router será criado sem VPN.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rede VPN <span className="text-red-500">*</span>
            </label>
            {loadingVpnNetworks ? (
              <div className="input w-full text-gray-500">Carregando redes VPN...</div>
            ) : (
              <>
                <select
                  name="vpnNetworkId"
                  value={formData.vpnNetworkId}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">Selecione uma rede VPN (opcional)</option>
                  {vpnNetworks.map((network) => (
                    <option key={network.id} value={String(network.id)}>
                      {network.name} ({network.cidr}) {network.isDefault && '(Padrão)'}
                    </option>
                  ))}
                </select>
                {vpnNetworks.length === 0 && (
                  <p className="mt-1 text-xs text-yellow-600">
                    ⚠️ Nenhuma rede VPN encontrada. Crie uma rede VPN primeiro na página VPN.
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Selecione a rede VPN onde o router será conectado. <strong>Obrigatório para gerar certificado.</strong>
                </p>
              </>
            )}
          </div>

          {formData.vpnNetworkId && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-800">
                ✅ Certificado VPN será gerado automaticamente após criar o router. Redes destino podem ser adicionadas ao editar o router.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="input w-full"
            rows="3"
            placeholder="Descrição opcional do router"
          />
        </div>

        {/* Seção Redes Destino (apenas ao editar) */}
        {isEditing && router?.id && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Redes Destino
              </h3>
              {editingDestNetwork === null && (
                <button
                  type="button"
                  onClick={handleAddDestNetwork}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Rede Destino
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Redes para as quais o tráfego da VPN será encaminhado por este router. Quando alguém na VPN acessa um destino diferente, o sistema (roteamento/iptables) encaminha o pacote para o túnel correto.
            </p>

            {editingDestNetwork !== null && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {editingDestNetwork.id ? 'Editar Rede Destino' : 'Nova Rede Destino'}
                  </h4>
                  <button type="button" onClick={handleCancelEditDestNetwork} className="text-gray-500 hover:text-gray-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CIDR <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={destNetworkForm.networkCidr}
                      onChange={(e) => { setDestNetworkForm(prev => ({ ...prev, networkCidr: e.target.value })); setDestNetworkErrors(prev => ({ ...prev, networkCidr: null })) }}
                      className={`input w-full text-sm ${destNetworkErrors.networkCidr ? 'border-red-500' : ''}`}
                      placeholder="192.168.1.0/24"
                    />
                    {destNetworkErrors.networkCidr && <p className="mt-1 text-xs text-red-600">{destNetworkErrors.networkCidr}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                    <input
                      type="text"
                      value={destNetworkForm.description}
                      onChange={(e) => setDestNetworkForm(prev => ({ ...prev, description: e.target.value }))}
                      className="input w-full text-sm"
                      placeholder="Ex: Rede filial"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={handleSaveDestNetwork} className="btn btn-primary btn-sm">
                    <Check className="w-4 h-4 mr-1" />
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {loadingDestinationNetworks ? (
              <p className="text-sm text-gray-500">Carregando redes destino...</p>
            ) : destinationNetworks.length === 0 && editingDestNetwork === null ? (
              <p className="text-sm text-gray-500">Nenhuma rede destino. Clique em &quot;Adicionar Rede Destino&quot; para incluir.</p>
            ) : (
              editingDestNetwork === null && (
                <ul className="space-y-2">
                  {destinationNetworks.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 py-2 px-3 bg-gray-50 rounded border border-gray-200">
                      <span className="font-mono text-sm shrink-0">{item.networkCidr}</span>
                      {item.description && <span className="text-xs text-gray-500 truncate min-w-0">{item.description}</span>}
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => handleEditDestNetwork(item)} className="text-blue-600 hover:text-blue-800 p-1" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteDestNetwork(item.id)} className="text-red-600 hover:text-red-800 p-1" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        {/* Seção de Rotas (apenas ao editar) */}
        {isEditing && router?.id && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                🛣️ Rotas Estáticas
              </h3>
              {!editingRoute && (
                <button
                  type="button"
                  onClick={handleAddRoute}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Rota
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Gerencie as rotas estáticas do router. As rotas serão salvas no banco de dados e podem ser aplicadas ao RouterOS posteriormente.
            </p>

            {/* Formulário de edição/criação de rota */}
            {editingRoute !== null && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {editingRoute.id ? 'Editar Rota' : 'Nova Rota'}
                  </h4>
                  <button
                    type="button"
                    onClick={handleCancelEditRoute}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Destino (CIDR) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="destination"
                      value={routeForm.destination}
                      onChange={handleRouteFormChange}
                      className={`input w-full text-sm ${routeErrors.destination ? 'border-red-500' : ''}`}
                      placeholder="192.168.1.0/24"
                    />
                    {routeErrors.destination && (
                      <p className="mt-1 text-xs text-red-600">{routeErrors.destination}</p>
                    )}
                  </div>

                </div>

                {/* Seção Avançado */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Configurações Avançadas
                  </button>
                  
                  {showAdvanced && (
                    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Distance
                          </label>
                          <input
                            type="number"
                            name="distance"
                            value={routeForm.distance}
                            onChange={handleRouteFormChange}
                            className="input w-full text-sm"
                            placeholder="1"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Scope
                          </label>
                          <input
                            type="number"
                            name="scope"
                            value={routeForm.scope}
                            onChange={handleRouteFormChange}
                            className="input w-full text-sm"
                            placeholder="30"
                            min="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Routing Table
                          </label>
                          <input
                            type="text"
                            name="routingTable"
                            value={routeForm.routingTable}
                            onChange={handleRouteFormChange}
                            className="input w-full text-sm"
                            placeholder="main"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Gateway <span className="text-gray-400 text-xs">(opcional)</span>
                          </label>
                          <input
                            type="text"
                            name="gateway"
                            value={routeForm.gateway}
                            onChange={handleRouteFormChange}
                            className={`input w-full text-sm ${routeErrors.gateway ? 'border-red-500' : ''}`}
                            placeholder="Deixe vazio para usar interface como gateway"
                          />
                          {routeErrors.gateway && (
                            <p className="mt-1 text-xs text-red-600">{routeErrors.gateway}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Se vazio, RouterOS usará a interface VPN como gateway automaticamente
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    value={routeForm.description}
                    onChange={handleRouteFormChange}
                    className="input w-full text-sm"
                    rows="2"
                    placeholder="Descrição opcional da rota"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleCancelEditRoute}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRoute}
                    className="btn btn-primary btn-sm"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Salvar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de rotas */}
            {loadingRoutes ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Carregando rotas...
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Nenhuma rota cadastrada
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {routes.map((route) => {
                  const isErrorOrPendingRemove = route.status === 'Error' || route.status === 'PendingRemove';
                  return (
                  <div
                    key={route.id}
                    className={`p-3 border rounded-lg flex items-center justify-between ${
                      isErrorOrPendingRemove
                        ? 'bg-red-50 border-red-300' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {route.destination}
                        </span>
                        <span className="text-xs text-gray-500">→</span>
                        <span className="text-sm text-gray-700">
                          {route.gateway}
                        </span>
                        {getStatusBadge(route.status)}
                      </div>
                      {(route.interface || route.distance || route.description) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {route.interface && <span>Interface: {route.interface}</span>}
                          {route.distance && <span className="ml-2">Distance: {route.distance}</span>}
                          {route.description && <span className="ml-2">• {route.description}</span>}
                        </div>
                      )}
                      {isErrorOrPendingRemove && route.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 font-semibold">
                          ⚠️ {route.status === 'PendingRemove' ? 'Aguardando remoção' : 'Erro'}: {route.errorMessage}
                        </div>
                      )}
                      {route.status === 'PendingRemove' && !route.errorMessage && (
                        <div className="text-xs text-red-600 mt-1 font-semibold">
                          ⚠️ Aguardando remoção do RouterOS...
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleEditRoute(route)}
                        className="btn btn-secondary btn-sm"
                        disabled={editingRoute !== null}
                        title="Editar rota"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoute(route.id)}
                        className="btn btn-error btn-sm"
                        disabled={editingRoute !== null}
                        title="Excluir rota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={createRouter.isPending || updateRouter.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createRouter.isPending || updateRouter.isPending}
          >
            {createRouter.isPending || updateRouter.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar'
              : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


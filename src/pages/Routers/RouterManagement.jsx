import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Shield, 
  Network, 
  Route as RouteIcon, 
  Wifi, 
  Terminal,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Edit,
  X,
  Trash2,
  Power,
  PowerOff,
  Play,
  Square
} from 'lucide-react'
import api from '../../services/api'
import { routersApi } from '../../services/routersApi'
import { routerOsWebSocketService } from '../../services/routerosWebSocketService'
import clsx from 'clsx'
import Modal from '../../components/Modal/Modal'

const TABS = {
  FIREWALL: 'firewall',
  NAT: 'nat',
  ROUTES: 'routes',
  INTERFACES: 'interfaces',
  TERMINAL: 'terminal'
}

/** apiUsername / apiPasswordTemporaria + apiPassword (compat nomes antigos) */
function routerApiUsername(r) {
  if (!r) return 'admin'
  return r.apiUsername || r.routerOsApiUsername || 'admin'
}
function routerApiPasswordForConnection(r) {
  if (!r) return ''
  const temp = (r.apiPasswordTemporaria || r.routerOsApiPassword || '').trim()
  const perm = (r.apiPassword || r.automaisApiPassword || '').trim()
  return temp || perm
}

export default function RouterManagement() {
  const { routerId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(TABS.FIREWALL)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({})
  const [terminalCommand, setTerminalCommand] = useState('')
  const [terminalHistory, setTerminalHistory] = useState([])
  const [executingCommand, setExecutingCommand] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null) // Item selecionado (clique simples)
  const [selectedItemForDetails, setSelectedItemForDetails] = useState(null) // Item para detalhes (duplo clique)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState(null)
  const [updatingSystemInfo, setUpdatingSystemInfo] = useState(false)
  const [router, setRouter] = useState(null)
  const wsConnectedRef = useRef(false)

  // Colunas do Winbox para cada tipo
  const WINBOX_COLUMNS = {
    firewall: ['chain', 'action', 'src-address', 'dst-address', 'protocol', 'dst-port', 'in-interface', 'out-interface', 'comment'],
    nat: ['chain', 'action', 'src-address', 'dst-address', 'protocol', 'dst-port', 'to-addresses', 'to-ports', 'comment'],
    routes: ['dst-address', 'gateway', 'distance', 'scope', 'target-scope', 'routing-mark', 'interface', 'comment'],
    interfaces: ['name', 'type', 'mtu', 'mac-address', 'rx-byte', 'tx-byte', 'rx-packet', 'tx-packet', 'running', 'disabled', 'comment']
  }

  useEffect(() => {
    loadRouterData()
    return () => {
      // Desconectar WebSocket ao desmontar componente
      if (wsConnectedRef.current) {
        routerOsWebSocketService.disconnect()
        wsConnectedRef.current = false
      }
    }
  }, [routerId])

  const loadRouterData = async () => {
    try {
      const routerData = await routersApi.getById(routerId)
      setRouter(routerData)
      await checkConnection(routerData)
    } catch (err) {
      setError('Erro ao carregar dados do router')
      setConnectionStatus({ connected: false })
    }
  }

  const getRouterIp = (routerData) => {
    // Tentar obter do RouterOsApiUrl
    if (routerData?.routerOsApiUrl) {
      // Remover protocolo se presente (http:// ou https://)
      let url = routerData.routerOsApiUrl.replace(/^https?:\/\//, '')
      // Pegar apenas o hostname/IP (antes de : ou /)
      const parts = url.split(':')
      if (parts.length > 0 && parts[0]) {
        const ip = parts[0].split('/')[0].trim()
        if (ip) {
          return ip
        }
      }
    }
    // Se não tiver, tentar buscar do peer WireGuard (seria necessário buscar via API)
    // Por enquanto, retornar null e deixar o backend buscar do peer WireGuard
    return null
  }

  const checkConnection = async (routerData = router) => {
    if (!routerData) {
      setError('Dados do router não disponíveis')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Conectar ao WebSocket via API C# usando routerId
      // A API C# fará o proxy para o routeros.io Python baseado no ServerEndpoint da VpnNetwork
      if (!routerOsWebSocketService.isConnected() || routerOsWebSocketService.getCurrentRouterId() !== routerId) {
        // Desconectar se já estava conectado a um router diferente
        if (routerOsWebSocketService.isConnected()) {
          await routerOsWebSocketService.disconnect()
        }
        await routerOsWebSocketService.connect(routerId)
        wsConnectedRef.current = true
      }

      // Obter IP do router (pode ser null - o backend buscará do peer WireGuard se necessário)
      const routerIp = getRouterIp(routerData)

      // Obter status via WebSocket (routerIp pode ser null - backend buscará se necessário)
      const status = await routerOsWebSocketService.getStatus(routerId, routerIp)
      
      // O backend retorna router_ip na resposta quando busca do peer WireGuard
      const finalRouterIp = status.router_ip || routerIp
      
      setConnectionStatus({
        connected: status.connected || false,
        success: status.success || false,
        routerIp: finalRouterIp,
        identity: status.identity,
        resource: status.resource,
        error: status.error
      })
      
      // Se conectou, atualizar informações do sistema
      if (status.connected && status.resource) {
        const resource = status.resource
        setSystemInfo({
          model: resource['board-name'] || resource['board-name'] || '-',
          serialNumber: routerData.serialNumber || '-',
          firmwareVersion: resource.version || '-',
          hardwareInfo: {
            cpuLoad: resource['cpu-load'] || resource['cpu-load'] || '-',
            memoryUsage: resource['free-memory'] && resource['total-memory'] 
              ? `${Math.round((1 - resource['free-memory'] / resource['total-memory']) * 100)}%`
              : '-',
            uptime: resource.uptime || '-'
          }
        })
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar ao router')
      setConnectionStatus({ connected: false, success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Função para atualizar status do sistema (usada tanto no useEffect quanto no botão)
  const refreshSystemInfo = useCallback(async () => {
    // Recarregar status (que já traz informações do sistema)
    // Não mostrar loading durante atualizações automáticas
    if (!connectionStatus?.connected || !router) return
    
    // Verificar se WebSocket está conectado antes de tentar
    if (!routerOsWebSocketService.isConnected()) {
      // Tentar reconectar se tiver routerId
      if (routerId && !routerOsWebSocketService.getState().includes('CONNECTING')) {
        try {
          await routerOsWebSocketService.connect(routerId)
        } catch (err) {
          // Ignorar erro silenciosamente
        }
      }
      return
    }
    
    try {
      const routerIp = connectionStatus.routerIp || getRouterIp(router)
      if (!routerIp) return

      // Obter status via WebSocket (com timeout curto para não bloquear)
      const status = await routerOsWebSocketService.getStatus(routerId, routerIp)
      
      // Atualizar connectionStatus com novos dados
      setConnectionStatus(prev => ({
        ...prev,
        routerIp: status.router_ip || prev.routerIp,
        identity: status.identity || prev.identity,
        resource: status.resource || prev.resource,
        error: status.error
      }))
      
      // Atualizar informações do sistema se conectado
      if (status.connected && status.resource) {
        const resource = status.resource
        setSystemInfo({
          model: resource['board-name'] || resource['board-name'] || '-',
          serialNumber: router?.serialNumber || '-',
          firmwareVersion: resource.version || '-',
          hardwareInfo: {
            cpuLoad: resource['cpu-load'] || resource['cpu-load'] || '-',
            memoryUsage: resource['free-memory'] && resource['total-memory'] 
              ? `${Math.round((1 - resource['free-memory'] / resource['total-memory']) * 100)}%`
              : '-',
            uptime: resource.uptime || '-'
          }
        })
      }
    } catch (err) {
      // Silenciar erros durante atualizações automáticas para não poluir a UI
      if (err.message?.includes('WebSocket não está conectado') || err.message?.includes('Timeout')) {
        // Atualizar status de conexão
        setConnectionStatus(prev => ({
          ...prev,
          connected: false,
          error: err.message || 'WebSocket desconectado'
        }))
        
        // Tentar reconectar se foi timeout
        if (err.message?.includes('Timeout') && routerId) {
          try {
            routerOsWebSocketService.forceDisconnect()
            await routerOsWebSocketService.connect(routerId, true)
          } catch (reconnectErr) {
            // Ignorar erro silenciosamente
          }
        }
      }
    }
  }, [connectionStatus?.connected, connectionStatus?.routerIp, router, routerId])

  // Atualizar status do sistema a cada 5 segundos (reduzido de 1s para evitar sobrecarga)
  useEffect(() => {
    if (!connectionStatus?.connected || !router) return

    const intervalId = setInterval(() => {
      refreshSystemInfo()
    }, 5000) // Atualizar a cada 5 segundos (reduzido para evitar sobrecarga)

    return () => {
      clearInterval(intervalId)
    }
  }, [connectionStatus?.connected, router, refreshSystemInfo])

  // Função para carregar dados da aba (usada tanto no useEffect quanto em outras funções)
  const loadTabData = useCallback(async (showLoading = true) => {
    if (!connectionStatus?.connected || !router) return

    try {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      // Usar routerIp do connectionStatus (já foi buscado pelo backend se necessário)
      const routerIp = connectionStatus.routerIp || getRouterIp(router)
      if (!routerIp) {
        // Se não tem routerIp, tentar buscar novamente do status
        console.warn('routerIp não encontrado, tentando buscar do status novamente...')
        if (showLoading) {
          setError('Aguardando IP do router...')
        }
        return
      }

      const username = routerApiUsername(router)
      const password = routerApiPasswordForConnection(router)

      let command = ''
      switch (activeTab) {
        case TABS.FIREWALL:
          command = '/ip/firewall/filter/print'
          break
        case TABS.NAT:
          command = '/ip/firewall/nat/print'
          break
        case TABS.ROUTES:
          command = '/ip/route/print'
          break
        case TABS.INTERFACES:
          command = '/interface/print'
          break
        default:
          return
      }

      // Executar comando via WebSocket
      const result = await routerOsWebSocketService.executeCommand(
        routerId,
        routerIp,
        username,
        password,
        command
      )

      // Processar resultado
      if (result.success !== false && result.data) {
        const items = Array.isArray(result.data) ? result.data : [result.data]
        
        switch (activeTab) {
          case TABS.FIREWALL:
            setData({ rules: items })
            break
          case TABS.NAT:
            setData({ rules: items })
            break
          case TABS.ROUTES:
            setData({ routes: items })
            break
          case TABS.INTERFACES:
            setData({ interfaces: items })
            break
        }
      } else {
        throw new Error(result.error || 'Erro ao executar comando')
      }
    } catch (err) {
      // Só mostrar erro se não for atualização automática silenciosa
      if (showLoading) {
        setError(err.message || 'Erro ao carregar dados')
      } else {
        // Erro ao atualizar dados da aba (silencioso)
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [activeTab, connectionStatus?.connected, connectionStatus?.routerIp, router, routerId])

  // Atualizar dados da aba ativa a cada 1 segundo
  useEffect(() => {
    if (!connectionStatus?.connected || !router) return

    // Carregar dados imediatamente (com loading)
    loadTabData(true)

    const intervalId = setInterval(() => {
      // Atualizar sem mostrar loading (atualização silenciosa)
      loadTabData(false)
    }, 1000) // Atualizar a cada 1 segundo

    return () => {
      clearInterval(intervalId)
    }
  }, [activeTab, connectionStatus?.connected, router, loadTabData])

  const formatTerminalResult = (data) => {
    // Se for um objeto com 'data' ou 'result', formatar como tabela do Winbox
    if (data && typeof data === 'object') {
      // Verificar se tem 'data' (resposta do WebSocket) ou 'result' (formato antigo)
      const items = data.data || data.result
      
      if (items && Array.isArray(items)) {
        if (items.length === 0) {
          return ''
        }
        
        // Formatar como tabela do Winbox
        const allKeys = new Set()
        items.forEach(item => {
          Object.keys(item).forEach(key => {
            if (key !== '.id' && !key.startsWith('=')) {
              allKeys.add(key)
            }
          })
        })

        const columns = Array.from(allKeys)
        
        if (columns.length === 0) {
          return ''
        }
        
        // Calcular largura das colunas (máximo 25 caracteres)
        const colWidths = columns.map(col => {
          const maxLength = Math.max(
            col.length,
            ...items.map(item => String(item[col] || '-').length)
          )
          return Math.min(maxLength + 1, 25)
        })
        
        // Criar tabela formatada (estilo Winbox)
        let output = ''
        
        // Linha de cabeçalho
        const header = columns.map((col, idx) => {
          return col.padEnd(colWidths[idx])
        }).join(' ')
        output += header + '\n'
        output += '-'.repeat(header.length) + '\n'
        
        // Linhas de dados
        items.forEach((item) => {
          const row = columns.map((col, idx) => {
            const value = item[col] || '-'
            const strValue = String(value).substring(0, colWidths[idx] - 1)
            return strValue.padEnd(colWidths[idx])
          }).join(' ')
          output += row + '\n'
        })
        
        return output
      } 
      // Verificar se tem 'success' (comando de escrita)
      else if (data.success !== undefined) {
        return data.message || (data.success ? 'Comando executado com sucesso' : data.error || '')
      }
    }
    
    // Se for array direto
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return ''
      }
      // Formatar array como tabela
      return formatTerminalResult({ data: data })
    }
    
    // Fallback: string vazia (não mostrar JSON raw)
    return ''
  }

  const executeTerminalCommand = async () => {
    if (!terminalCommand.trim() || executingCommand || !router) return

    try {
      setExecutingCommand(true)
      setError(null)

      // Usar routerIp do connectionStatus (já foi buscado pelo backend se necessário)
      const routerIp = connectionStatus?.routerIp || getRouterIp(router)
      if (!routerIp) {
        throw new Error('IP do router não encontrado')
      }

      const username = routerApiUsername(router)
      const password = routerApiPasswordForConnection(router)

      // Executar comando via WebSocket
      const result = await routerOsWebSocketService.executeCommand(
        routerId,
        routerIp,
        username,
        password,
        terminalCommand
      )

      const formattedResult = formatTerminalResult(result.data || result)

      setTerminalHistory(prev => [
        ...prev,
        { type: 'command', content: terminalCommand },
        { type: 'result', content: formattedResult }
      ])

      setTerminalCommand('')
    } catch (err) {
      setError(err.message || 'Erro ao executar comando')
      setTerminalHistory(prev => [
        ...prev,
        { type: 'command', content: terminalCommand },
        { type: 'error', content: err.message }
      ])
    } finally {
      setExecutingCommand(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeTerminalCommand()
    }
  }

  const handleRowClick = (item) => {
    // Clique simples: seleciona item para mostrar botões de ação
    setSelectedItem(item)
  }

  const handleRowDoubleClick = (item) => {
    // Duplo clique: abre modal de detalhes
    setSelectedItemForDetails(item)
    setIsConfigModalOpen(true)
  }

  const canItemBeDisabled = (item) => {
    // Verificar se o item pode ser desativado (tem campo 'disabled' ou é dinâmico)
    return item && ('disabled' in item || 'dynamic' in item)
  }

  const isItemDisabled = (item) => {
    return item?.disabled === 'true' || item?.disabled === true
  }

  const getEnableCommand = (tab, itemId) => {
    switch (tab) {
      case TABS.FIREWALL:
        return `/ip/firewall/filter/enable .id=${itemId}`
      case TABS.NAT:
        return `/ip/firewall/nat/enable .id=${itemId}`
      case TABS.ROUTES:
        return `/ip/route/enable .id=${itemId}`
      case TABS.INTERFACES:
        return `/interface/enable .id=${itemId}`
      default:
        return ''
    }
  }

  const getDisableCommand = (tab, itemId) => {
    switch (tab) {
      case TABS.FIREWALL:
        return `/ip/firewall/filter/disable .id=${itemId}`
      case TABS.NAT:
        return `/ip/firewall/nat/disable .id=${itemId}`
      case TABS.ROUTES:
        return `/ip/route/disable .id=${itemId}`
      case TABS.INTERFACES:
        return `/interface/disable .id=${itemId}`
      default:
        return ''
    }
  }

  const getDeleteCommand = (tab, itemId) => {
    switch (tab) {
      case TABS.FIREWALL:
        return `/ip/firewall/filter/remove .id=${itemId}`
      case TABS.NAT:
        return `/ip/firewall/nat/remove .id=${itemId}`
      case TABS.ROUTES:
        return `/ip/route/remove .id=${itemId}`
      case TABS.INTERFACES:
        return `/interface/remove .id=${itemId}`
      default:
        return ''
    }
  }

  const executeRouterCommand = async (command) => {
    if (!router) throw new Error('Dados do router não disponíveis')

    // Usar routerIp do connectionStatus (já foi buscado pelo backend se necessário)
    const routerIp = connectionStatus?.routerIp || getRouterIp(router)
    if (!routerIp) {
      throw new Error('IP do router não encontrado')
    }

    const username = routerApiUsername(router)
    const password = routerApiPasswordForConnection(router)

    return await routerOsWebSocketService.executeCommand(
      routerId,
      routerIp,
      username,
      password,
      command
    )
  }

  const handleEnableItem = async () => {
    if (!selectedItem || !selectedItem['.id'] || !router) return
    
    try {
      setActionLoading(true)
      const command = getEnableCommand(activeTab, selectedItem['.id'])
      await executeRouterCommand(command)
      setSelectedItem(null)
      await loadTabData() // Recarregar dados
    } catch (err) {
      setError(err.message || 'Erro ao ativar item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisableItem = async () => {
    if (!selectedItem || !selectedItem['.id'] || !router) return
    
    try {
      setActionLoading(true)
      const command = getDisableCommand(activeTab, selectedItem['.id'])
      await executeRouterCommand(command)
      setSelectedItem(null)
      await loadTabData() // Recarregar dados
    } catch (err) {
      setError(err.message || 'Erro ao desativar item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!selectedItem || !selectedItem['.id'] || !router) return
    
    if (!window.confirm('Tem certeza que deseja excluir este item?')) {
      return
    }
    
    try {
      setActionLoading(true)
      const command = getDeleteCommand(activeTab, selectedItem['.id'])
      await executeRouterCommand(command)
      setSelectedItem(null)
      await loadTabData() // Recarregar dados
    } catch (err) {
      setError(err.message || 'Erro ao excluir item')
    } finally {
      setActionLoading(false)
    }
  }

  const renderTable = (items, type) => {
    if (!items || items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Nenhum item encontrado
        </div>
      )
    }

    // Usar colunas do Winbox se disponíveis, senão usar todas as colunas disponíveis
    const winboxColumns = WINBOX_COLUMNS[type] || []
    const allKeys = new Set()
    items.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== '.id' && !key.startsWith('=')) {
          allKeys.add(key)
        }
      })
    })

    // Se temos colunas do Winbox definidas, usar apenas elas (na ordem correta)
    // Senão, usar todas as colunas disponíveis
    const columns = winboxColumns.length > 0
      ? winboxColumns.filter(col => allKeys.has(col))
      : Array.from(allKeys)

    // Formatar valores para exibição
    const formatValue = (value, column) => {
      if (value === null || value === undefined || value === '') return '-'
      
      // Formatar bytes para interfaces
      if ((column === 'rx-byte' || column === 'tx-byte') && !isNaN(value)) {
        const bytes = parseInt(value)
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
        return `${bytes} B`
      }

      return String(value)
    }

    // Obter classe CSS para destacar valores importantes
    const getValueClassName = (value, column) => {
      // Formatar booleanos (similar ao Winbox)
      if (value === 'true' || value === true) return 'text-green-600 font-bold'
      if (value === 'false' || value === false) return 'text-gray-400'
      
      // Destacar ações importantes
      if (column === 'action') {
        const actionColors = {
          'accept': 'text-green-600 font-semibold',
          'drop': 'text-red-600 font-semibold',
          'reject': 'text-orange-600 font-semibold',
          'masquerade': 'text-blue-600 font-semibold',
          'src-nat': 'text-blue-600 font-semibold',
          'dst-nat': 'text-blue-600 font-semibold'
        }
        return actionColors[String(value)?.toLowerCase()] || 'text-gray-700'
      }

      return 'text-gray-800'
    }

    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-100">
              {columns.map(col => (
                <th key={col} className="text-left p-2.5 font-semibold text-gray-800 text-xs border-r border-gray-200 last:border-r-0">
                  {col.replace(/-/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr 
                key={item['.id'] || idx} 
                className={clsx(
                  "border-b border-gray-200 cursor-pointer transition-colors",
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50",
                  "hover:bg-blue-100",
                  selectedItem && selectedItem['.id'] === item['.id'] && "bg-blue-200"
                )}
                onClick={() => handleRowClick(item)}
                onDoubleClick={() => handleRowDoubleClick(item)}
              >
                {columns.map(col => (
                  <td key={col} className={clsx("p-2.5 text-xs border-r border-gray-100 last:border-r-0 font-mono", getValueClassName(item[col], col))}>
                    {formatValue(item[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderConfigModal = () => {
    if (!selectedItemForDetails) return null

    const formatFieldName = (key) => {
      return key
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    }

    const formatFieldValue = (value) => {
      if (value === null || value === undefined || value === '') return '(vazio)'
      if (value === 'true' || value === true) return 'Sim'
      if (value === 'false' || value === false) return 'Não'
      return String(value)
    }

    return (
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => {
          setIsConfigModalOpen(false)
          setSelectedItemForDetails(null)
        }}
        title={`Configuração - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">ID: {selectedItemForDetails['.id'] || 'N/A'}</p>
            <p className="text-xs text-gray-500">
              Clique duas vezes em um campo para editar (em desenvolvimento)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(selectedItemForDetails)
              .filter(([key]) => key !== '.id' && !key.startsWith('='))
              .map(([key, value]) => (
                <div key={key} className="border-b border-gray-100 pb-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase">
                    {formatFieldName(key)}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                    {formatFieldValue(value)}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              onClick={() => {
                setIsConfigModalOpen(false)
                setSelectedItemForDetails(null)
              }}
              className="btn btn-secondary btn-sm"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                // TODO: Implementar edição
                alert('Edição em desenvolvimento. Use o terminal para editar manualmente.')
              }}
              className="btn btn-primary btn-sm"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/routers')}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciamento Router
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {router?.name || 'Carregando...'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Status da conexão */}
          <div className="flex items-center gap-2">
            {connectionStatus?.connected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">Conectado</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-600">Desconectado</span>
              </>
            )}
          </div>
          <button
            onClick={checkConnection}
            className="btn btn-secondary btn-sm"
            disabled={loading}
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Reconectar
          </button>
        </div>
      </div>

      {/* Informações do Sistema */}
      {connectionStatus?.connected && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Informações do Sistema</h2>
            <button
              onClick={refreshSystemInfo}
              className="btn btn-secondary btn-sm"
              disabled={updatingSystemInfo}
            >
              <RefreshCw className={clsx('w-4 h-4 mr-1', updatingSystemInfo && 'animate-spin')} />
              Atualizar
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Modelo</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {systemInfo?.model || connectionStatus?.model || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Número de Série</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {systemInfo?.serialNumber || connectionStatus?.serialNumber || '-'}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Firmware</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">
                {systemInfo?.firmwareVersion || connectionStatus?.firmwareVersion || '-'}
              </p>
            </div>
            {(() => {
              const hardwareInfo = systemInfo?.hardwareInfo 
                ? (typeof systemInfo.hardwareInfo === 'string' 
                    ? JSON.parse(systemInfo.hardwareInfo) 
                    : systemInfo.hardwareInfo)
                : null
              
              if (!hardwareInfo) return null
              
              return (
                <>
                  {hardwareInfo.cpuLoad && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">CPU Load</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {hardwareInfo.cpuLoad}%
                      </p>
                    </div>
                  )}
                  {hardwareInfo.memoryUsage && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Memória</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {hardwareInfo.memoryUsage}
                      </p>
                    </div>
                  )}
                  {hardwareInfo.temperature && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Temperatura</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {hardwareInfo.temperature}°C
                      </p>
                    </div>
                  )}
                  {hardwareInfo.uptime && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase">Uptime</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {hardwareInfo.uptime}
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="card p-4 bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: TABS.FIREWALL, label: 'Firewall', icon: Shield },
            { id: TABS.NAT, label: 'NAT', icon: Network },
            { id: TABS.ROUTES, label: 'Rotas', icon: RouteIcon },
            { id: TABS.INTERFACES, label: 'Interfaces', icon: Wifi },
            { id: TABS.TERMINAL, label: 'Terminal', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-4 py-2 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="card p-6">
        {loading && activeTab !== TABS.TERMINAL ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : activeTab === TABS.TERMINAL ? (
          <div className="space-y-4">
            <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto">
              {terminalHistory.length === 0 ? (
                <div className="text-gray-500">
                  Digite um comando RouterOS e pressione Enter para executar...
                </div>
              ) : (
                terminalHistory.map((item, idx) => (
                  <div key={idx} className="mb-2">
                    {item.type === 'command' && (
                      <div className="text-blue-400">
                        <span className="text-gray-500">$</span> {item.content}
                      </div>
                    )}
                    {item.type === 'result' && (
                      <div className="text-green-400 whitespace-pre font-mono text-xs">
                        {item.content}
                      </div>
                    )}
                    {item.type === 'error' && (
                      <div className="text-red-400">
                        {item.content}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={terminalCommand}
                onChange={(e) => setTerminalCommand(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite um comando RouterOS (ex: /ip/address/print)"
                className="flex-1 input font-mono"
                disabled={executingCommand || !connectionStatus?.connected}
              />
              <button
                onClick={executeTerminalCommand}
                className="btn btn-primary"
                disabled={executingCommand || !terminalCommand.trim() || !connectionStatus?.connected}
              >
                {executingCommand ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Executar'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Barra de ações (botões acima da tabela, estilo Winbox) */}
            {selectedItem && (activeTab === TABS.FIREWALL || activeTab === TABS.NAT || activeTab === TABS.ROUTES || activeTab === TABS.INTERFACES) && (
              <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Item selecionado: {selectedItem['.id'] || 'N/A'}
                  </span>
                  {selectedItem.name && (
                    <span className="text-sm text-gray-600">
                      ({selectedItem.name})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canItemBeDisabled(selectedItem) && (
                    <>
                      {isItemDisabled(selectedItem) ? (
                        <button
                          onClick={handleEnableItem}
                          disabled={actionLoading}
                          className="btn btn-success btn-sm"
                          title="Ativar item"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Ativar
                        </button>
                      ) : (
                        <button
                          onClick={handleDisableItem}
                          disabled={actionLoading}
                          className="btn btn-warning btn-sm"
                          title="Desativar item"
                        >
                          <Square className="w-4 h-4 mr-1" />
                          Desativar
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={handleDeleteItem}
                    disabled={actionLoading}
                    className="btn btn-error btn-sm"
                    title="Excluir item"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </button>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="btn btn-secondary btn-sm"
                    title="Desselecionar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {activeTab === TABS.FIREWALL && renderTable(data.rules, 'firewall')}
            {activeTab === TABS.NAT && renderTable(data.rules, 'nat')}
            {activeTab === TABS.ROUTES && renderTable(data.routes, 'routes')}
            {activeTab === TABS.INTERFACES && renderTable(data.interfaces, 'interfaces')}
          </div>
        )}
      </div>

      {/* Modal de Configuração */}
      {renderConfigModal()}
    </div>
  )
}


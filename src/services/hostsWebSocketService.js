import { getHostsWsUrl } from '../config/api'

/**
 * WebSocket para console SSH (serviço hosts.io) via proxy da API.
 * Credenciais ficam no backend; só enviamos host_id + comando.
 */
class HostsWebSocketService {
  constructor() {
    this.connection = null
    this.currentHostId = null
    this.messageId = 0
    this.pendingRequests = new Map()
    this.connectPromise = null
    this.connectionTimeout = 15000
  }

  async connect(hostId, forceReconnect = false) {
    if (!hostId) throw new Error('hostId é obrigatório')

    if (this.connectPromise && !forceReconnect) return this.connectPromise

    if (
      !forceReconnect &&
      this.connection?.readyState === WebSocket.OPEN &&
      this.currentHostId === hostId
    ) {
      return this.connection
    }

    if (this.connection && (forceReconnect || this.currentHostId !== hostId)) {
      try {
        this.connection.close()
      } catch (_) {}
      this.connection = null
    }

    const wsUrl = getHostsWsUrl(hostId)
    this.connectPromise = new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        try {
          this.connection?.close()
        } catch (_) {}
        this.connection = null
        this.connectPromise = null
        reject(new Error(`Timeout ao conectar WebSocket (${this.connectionTimeout}ms)`))
      }, this.connectionTimeout)

      try {
        this.connection = new WebSocket(wsUrl)
        this.connection.onopen = () => {
          clearTimeout(t)
          this.currentHostId = hostId
          this.connectPromise = null
          resolve(this.connection)
        }
        this.connection.onmessage = (event) => {
          try {
            const data =
              typeof event.data === 'string' ? JSON.parse(event.data) : event.data
            this.handleMessage(data)
          } catch (e) {
            console.error('[Hosts WS] parse:', e)
          }
        }
        this.connection.onerror = () => {
          clearTimeout(t)
          this.connectPromise = null
        }
        this.connection.onclose = () => {
          this.pendingRequests.forEach(({ reject: r, timeoutId }) => {
            clearTimeout(timeoutId)
            r(new Error('WebSocket desconectado'))
          })
          this.pendingRequests.clear()
          this.connection = null
        }
      } catch (err) {
        clearTimeout(t)
        this.connectPromise = null
        reject(err)
      }
    })

    return this.connectPromise
  }

  handleMessage(data) {
    if (data.id && this.pendingRequests.has(data.id)) {
      const { resolve, reject, timeoutId } = this.pendingRequests.get(data.id)
      clearTimeout(timeoutId)
      this.pendingRequests.delete(data.id)
      if (data.error || data.success === false) {
        reject(new Error(data.error || 'Erro desconhecido'))
      } else {
        resolve(data)
      }
    }
  }

  async send(message, timeout = 120000, maxRetries = 1) {
    let lastError = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
          if (this.currentHostId) {
            await this.connect(this.currentHostId, true)
            await new Promise((r) => setTimeout(r, 200))
          } else {
            throw new Error('WebSocket não conectado')
          }
        }

        return await new Promise((resolve, reject) => {
          const id = ++this.messageId
          const request = { ...message, id }
          const timeoutId = setTimeout(() => {
            this.pendingRequests.delete(id)
            reject(new Error(`Timeout após ${timeout}ms`))
          }, timeout)
          this.pendingRequests.set(id, { resolve, reject, timeoutId })
          this.connection.send(JSON.stringify(request))
        })
      } catch (e) {
        lastError = e
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 500))
          try {
            this.connection?.close()
          } catch (_) {}
          this.connection = null
        }
      }
    }
    throw lastError
  }

  async executeCommand(hostId, command) {
    await this.connect(hostId)
    return this.send(
      {
        action: 'execute_command',
        host_id: hostId,
        command,
      },
      120000,
      1
    )
  }

  disconnect() {
    try {
      this.connection?.close()
    } catch (_) {}
    this.connection = null
    this.currentHostId = null
    this.pendingRequests.clear()
    this.connectPromise = null
  }
}

export const hostsWebSocketService = new HostsWebSocketService()

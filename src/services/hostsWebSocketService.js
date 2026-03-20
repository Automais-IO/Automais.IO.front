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
    this._lastServerError = null
    this._lastCloseReason = null
  }

  /** Garante socket aberto; lança erro claro se não houver conexão. */
  _assertOpenSocket() {
    const ws = this.connection
    if (ws && ws.readyState === WebSocket.OPEN) return ws

    const parts = ['WebSocket do console Hosts não está aberto.']
    if (this._lastServerError) parts.push(`Servidor: ${this._lastServerError}`)
    if (this._lastCloseReason) parts.push(`Fechamento: ${this._lastCloseReason}`)
    parts.push(
      'Confira o serviço Automais.IO.hosts na porta 8766, ' +
        'o Nginx (location /api/ws/hosts/) e se a aba ainda está nesta página.'
    )
    throw new Error(parts.join(' '))
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

    this._lastServerError = null
    this._lastCloseReason = null

    const wsUrl = getHostsWsUrl(hostId)
    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false

      const finish = (fn, arg) => {
        if (settled) return
        settled = true
        this.connectPromise = null
        clearTimeout(t)
        fn(arg)
      }

      const t = setTimeout(() => {
        try {
          this.connection?.close()
        } catch (_) {}
        this.connection = null
        finish(reject, new Error(`Timeout ao conectar WebSocket (${this.connectionTimeout}ms)`))
      }, this.connectionTimeout)

      try {
        const ws = new WebSocket(wsUrl)
        this.connection = ws

        ws.onopen = () => {
          if (ws !== this.connection) return
          this.currentHostId = hostId
          finish(resolve, ws)
        }

        ws.onmessage = (event) => {
          try {
            const data =
              typeof event.data === 'string' ? JSON.parse(event.data) : event.data
            this.handleMessage(data)
          } catch (e) {
            console.error('[Hosts WS] parse:', e)
          }
        }

        ws.onerror = () => {
          if (ws !== this.connection) return
          const detail = this._lastServerError
            ? ` Servidor: ${this._lastServerError}`
            : ''
          finish(
            reject,
            new Error(
              'Falha na conexão WebSocket do console Hosts (wss → /api/ws/hosts/).' +
                detail +
                ' Verifique Nginx, serviço Automais.IO.hosts na 8766 e certificado.'
            )
          )
        }

        ws.onclose = (event) => {
          const code = event.code
          const reason = event.reason || ''
          if (reason) this._lastCloseReason = `${code} – ${reason}`
          else if (code !== 1000) this._lastCloseReason = `código ${code}`

          const closeDetail = this._lastServerError || reason || `código ${code}`

          this.pendingRequests.forEach(({ reject: r, timeoutId }) => {
            clearTimeout(timeoutId)
            r(new Error(`WebSocket desconectado (${closeDetail})`))
          })
          this.pendingRequests.clear()

          if (ws === this.connection) this.connection = null

          if (!settled) {
            finish(
              reject,
              new Error(
                'WebSocket fechou antes de estabilizar' +
                  (this._lastServerError
                    ? `: ${this._lastServerError}`
                    : `. Serviço Hosts (8766) ou proxy da API pode estar indisponível (${closeDetail}).`)
              )
            )
          }
        }
      } catch (err) {
        this.connection = null
        finish(reject, err)
      }
    })

    return this.connectPromise
  }

  handleMessage(data) {
    const reqId = data.id
    if (reqId == null) {
      if (data.error || data.success === false) {
        this._lastServerError = data.error || 'Erro do servidor (sem detalhes)'
        console.warn('[Hosts WS] Erro do servidor (sem request ID):', data.error)
      }
      return
    }
    const key = typeof reqId === 'number' ? reqId : String(reqId)
    for (const k of this.pendingRequests.keys()) {
      if (k === reqId || String(k) === key) {
        const { resolve, reject, timeoutId } = this.pendingRequests.get(k)
        clearTimeout(timeoutId)
        this.pendingRequests.delete(k)
        if (data.error || data.success === false) {
          reject(new Error(data.error || 'Erro desconhecido'))
        } else {
          resolve(data)
        }
        return
      }
    }
  }

  async send(message, timeout = 120000, maxRetries = 1) {
    let lastError = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
          const hid = message.host_id || this.currentHostId
          if (hid) {
            await this.connect(String(hid), true)
            await new Promise((r) => setTimeout(r, 100))
          } else {
            throw new Error('WebSocket não conectado (host_id ausente).')
          }
        }

        const ws = this._assertOpenSocket()

        return await new Promise((resolve, reject) => {
          const id = ++this.messageId
          const request = { ...message, id }
          const timeoutId = setTimeout(() => {
            this.pendingRequests.delete(id)
            reject(new Error(`Timeout após ${timeout}ms`))
          }, timeout)
          this.pendingRequests.set(id, { resolve, reject, timeoutId })
          try {
            ws.send(JSON.stringify(request))
          } catch (e) {
            clearTimeout(timeoutId)
            this.pendingRequests.delete(id)
            reject(e)
          }
        })
      } catch (e) {
        lastError = e
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 400))
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
    const hid = String(hostId)
    await this.connect(hid)
    return this.send(
      {
        action: 'execute_command',
        host_id: hid,
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

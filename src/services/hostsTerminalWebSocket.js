import { getHostsWsUrl } from '../config/api'

/**
 * WebSocket dedicado ao modo terminal (PTY): streaming bidirecional, sem botão Enviar.
 * Protocolo alinhado a Automais.IO.hosts (terminal_start, type in/out).
 */
function stringUtf8ToB64(s) {
  const u8 = new TextEncoder().encode(s)
  let bin = ''
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i])
  return btoa(bin)
}

function b64ToUint8Array(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export class HostsTerminalSession {
  constructor() {
    this._ws = null
    this._hostId = null
    this._clientKey = null
    this._connectPromise = null
    this._onOutput = null
    this._onError = null
    this._onClose = null
    this._onRemoteSessionEnded = null
    this._onClientKey = null
    this._connectionTimeout = 20000
  }

  /**
   * @param {string} hostId
   * @param {{ cols: number, rows: number }} dims
   * @param {{
   *   onOutput: (u8: Uint8Array) => void,
   *   onError?: (msg: string) => void,
   *   onClose?: () => void,
   *   onRemoteSessionEnded?: () => void,
   * }} callbacks
   * @param {{ resumeKey?: string, onClientKey?: (key: string) => void }} [options]
   */
  async connect(hostId, dims, callbacks, options = {}) {
    this.close()
    this._hostId = String(hostId)
    this._onOutput = callbacks.onOutput
    this._onError = callbacks.onError
    this._onClose = callbacks.onClose
    this._onRemoteSessionEnded = callbacks.onRemoteSessionEnded ?? null
    this._onClientKey = options.onClientKey ?? null
    const resumeKey = options.resumeKey?.trim() || null

    const wsUrl = getHostsWsUrl(this._hostId)
    const { cols, rows } = dims

    this._connectPromise = new Promise((resolve, reject) => {
      let settled = false
      const finish = (fn, arg) => {
        if (settled) return
        settled = true
        clearTimeout(t)
        fn(arg)
      }

      const t = setTimeout(() => {
        try {
          this._ws?.close()
        } catch (_) {}
        this._ws = null
        finish(reject, new Error(`Timeout ao conectar terminal (${this._connectionTimeout}ms)`))
      }, this._connectionTimeout)

      try {
        const ws = new WebSocket(wsUrl)
        this._ws = ws

        ws.onopen = () => {
          if (ws !== this._ws) return
          try {
            const start = {
              action: 'terminal_start',
              host_id: this._hostId,
              cols: Math.max(40, Math.min(cols, 500)),
              rows: Math.max(8, Math.min(rows, 200)),
            }
            if (resumeKey) start.resume_key = resumeKey
            ws.send(JSON.stringify(start))
            finish(resolve, undefined)
          } catch (e) {
            finish(reject, e)
          }
        }

        ws.onmessage = (event) => {
          if (ws !== this._ws) return
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : null
            if (!data) return
            if (data.type === 'out' && data.b64) {
              const u8 = b64ToUint8Array(data.b64)
              this._onOutput?.(u8)
            } else if (data.type === 'error') {
              this._onError?.(data.message || 'Erro no terminal')
            } else if (data.type === 'client_key' && data.client_key) {
              this._clientKey = String(data.client_key)
              this._onClientKey?.(this._clientKey)
            } else if (data.type === 'resumed' && data.client_key) {
              this._clientKey = String(data.client_key)
              this._onClientKey?.(this._clientKey)
            } else if (data.type === 'session_end') {
              this._onRemoteSessionEnded?.()
              this._onClose?.()
            }
          } catch (e) {
            console.error('[Hosts terminal] parse:', e)
          }
        }

        ws.onerror = () => {
          if (ws !== this._ws) return
          finish(
            reject,
            new Error('Falha na conexão WebSocket do terminal. Verifique API, Nginx e serviço hosts (8766).')
          )
        }

        ws.onclose = () => {
          if (ws === this._ws) this._ws = null
          this._onClose?.()
          if (!settled) {
            finish(
              reject,
              new Error('WebSocket fechou antes de concluir o handshake do terminal.')
            )
          }
        }
      } catch (e) {
        this._ws = null
        finish(reject, e)
      }
    })

    await this._connectPromise
    this._connectPromise = null
  }

  /** Envia teclas / entrada bruta (xterm onData). */
  sendInput(text) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(JSON.stringify({ type: 'in', b64: stringUtf8ToB64(text) }))
  }

  sendResize(cols, rows) {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(
      JSON.stringify({
        action: 'terminal_resize',
        host_id: this._hostId,
        cols: Math.max(40, Math.min(cols, 500)),
        rows: Math.max(8, Math.min(rows, 200)),
      })
    )
  }

  /** Ctrl+C explícito (útil em touch); também chega via onData como \x03. */
  sendInterrupt() {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return
    this._ws.send(JSON.stringify({ action: 'terminal_intr', host_id: this._hostId }))
  }

  /** Encerra o PTY no servidor (não apenas o WebSocket). */
  sendTerminalClose() {
    if (
      !this._ws ||
      this._ws.readyState !== WebSocket.OPEN ||
      !this._clientKey ||
      !this._hostId
    )
      return
    try {
      this._ws.send(
        JSON.stringify({
          action: 'terminal_close',
          host_id: this._hostId,
          client_key: this._clientKey,
        })
      )
    } catch (_) {}
  }

  close() {
    try {
      this._ws?.close()
    } catch (_) {}
    this._ws = null
    this._hostId = null
    this._clientKey = null
    this._onOutput = null
    this._onError = null
    this._onClose = null
    this._onRemoteSessionEnded = null
    this._onClientKey = null
    this._connectPromise = null
  }

  get isOpen() {
    return this._ws?.readyState === WebSocket.OPEN
  }
}

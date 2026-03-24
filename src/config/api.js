/**
 * API em api.automais.io no dev e na produção.
 * Override opcional: .env.local → VITE_API_BASE_URL=http://localhost:5000/api
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.automais.io/api'

export function getApiBaseUrl() {
  return API_BASE_URL
}

/** @deprecated não altera a URL da API */
export function isProduction() {
  if (typeof window === 'undefined') return false
  try {
    const h = window.location.hostname
    return h === 'automais.io' || h === 'www.automais.io'
  } catch {
    return false
  }
}

function apiUrlParts() {
  try {
    const u = new URL(API_BASE_URL)
    return {
      host: u.host,
      pathPrefix: u.pathname.replace(/\/$/, '') || '/api',
      wsProto: u.protocol === 'https:' ? 'wss:' : 'ws:',
    }
  } catch {
    return { host: 'api.automais.io', pathPrefix: '/api', wsProto: 'wss:' }
  }
}

export const SIGNALR_BASE_URL = (() => {
  const { host, pathPrefix, wsProto } = apiUrlParts()
  const httpProto = wsProto === 'wss:' ? 'https:' : 'http:'
  return `${httpProto}//${host}${pathPrefix}/hubs`
})()

export function getSignalRBaseUrl() {
  return SIGNALR_BASE_URL
}

/** WebSocket RouterOS (mesmo host da API) */
export function getRouterOsWsUrl(routerId) {
  if (!routerId) {
    throw new Error('routerId é obrigatório para conectar ao WebSocket RouterOS')
  }
  const { host, pathPrefix, wsProto } = apiUrlParts()
  return `${wsProto}//${host}${pathPrefix}/ws/routeros/${routerId}`
}

export function getRouterOsWsUrlDefault() {
  const { host, pathPrefix, wsProto } = apiUrlParts()
  return `${wsProto}//${host}${pathPrefix}/ws/routeros`
}

/**
 * WebSocket Hosts / SSH (mesmo host da API).
 * O JWT vai na query (?access_token=) porque o browser não envia Authorization no handshake WebSocket.
 * @param {string} hostId
 * @param {string | null | undefined} [accessToken] — se omitido, usa localStorage.token no browser
 */
export function getHostsWsUrl(hostId, accessToken) {
  if (!hostId) {
    throw new Error('hostId é obrigatório para o WebSocket Hosts')
  }
  const token =
    accessToken !== undefined && accessToken !== null
      ? accessToken
      : typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null
  if (!token || !String(token).trim()) {
    throw new Error(
      'Sessão não encontrada: faça login novamente para usar o console do host.'
    )
  }
  const { host, pathPrefix, wsProto } = apiUrlParts()
  const q = new URLSearchParams({ access_token: String(token).trim() })
  return `${wsProto}//${host}${pathPrefix}/ws/hosts/${hostId}?${q.toString()}`
}

/**
 * WebSocket display remoto (VNC/RFB via túnel). Mesmo host da API; JWT na query.
 * @param {string} hostId
 * @param {string | null | undefined} [accessToken]
 */
/**
 * URL absoluta da UI web do device (proxy HTTP na API). JWT na query para o iframe.
 * @param {string} devEui DevEUI do device (hex, ex.: 16 caracteres LoRaWAN)
 * @param {string} [relativePath] caminho após /web-ui/ (ex.: "style.css" ou "api/foo")
 * @param {string | null | undefined} [accessToken]
 */
export function getDeviceWebUiUrl(devEui, relativePath = '', accessToken) {
  if (!devEui) {
    throw new Error('DevEUI é obrigatório para abrir a UI remota do device')
  }
  const token =
    accessToken !== undefined && accessToken !== null
      ? accessToken
      : typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null
  if (!token || !String(token).trim()) {
    throw new Error('Sessão não encontrada: faça login novamente.')
  }
  const base = API_BASE_URL.replace(/\/$/, '')
  let pathSuffix = ''
  if (relativePath && relativePath !== '/') {
    const clean = String(relativePath).replace(/^\/+/, '')
    pathSuffix = clean ? `/${clean}` : ''
  }
  const enc = encodeURIComponent(String(devEui).trim())
  const url = new URL(`${base}/devices/${enc}/web-ui${pathSuffix || '/'}`)
  url.searchParams.set('access_token', String(token).trim())
  return url.toString()
}

export function getRemoteDisplayWsUrl(hostId, accessToken) {
  if (!hostId) {
    throw new Error('hostId é obrigatório para o display remoto')
  }
  const token =
    accessToken !== undefined && accessToken !== null
      ? accessToken
      : typeof window !== 'undefined'
        ? localStorage.getItem('token')
        : null
  if (!token || !String(token).trim()) {
    throw new Error(
      'Sessão não encontrada: faça login novamente para usar o display remoto.'
    )
  }
  const { host, pathPrefix, wsProto } = apiUrlParts()
  const q = new URLSearchParams({ access_token: String(token).trim() })
  return `${wsProto}//${host}${pathPrefix}/ws/remote/${hostId}?${q.toString()}`
}

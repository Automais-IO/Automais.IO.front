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

/** WebSocket Hosts / SSH (mesmo host da API) */
export function getHostsWsUrl(hostId) {
  if (!hostId) {
    throw new Error('hostId é obrigatório para o WebSocket Hosts')
  }
  const { host, pathPrefix, wsProto } = apiUrlParts()
  return `${wsProto}//${host}${pathPrefix}/ws/hosts/${hostId}`
}

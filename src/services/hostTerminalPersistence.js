/**
 * Mantém instâncias de xterm + WebSocket ao sair da página de console (navegação SPA).
 * Não sobrevive a F5 ou fechar a aba (o browser encerra o WebSocket).
 */
const PERSIST_ROOT_ID = 'automais-host-terminal-persist-root'

/** @type {Map<string, { inner: HTMLDivElement, term: import('@xterm/xterm').Terminal, fit: import('@xterm/addon-fit').FitAddon, session: import('./hostsTerminalWebSocket').HostsTerminalSession }>} */
const storage = new Map()

/** Chave por host para reanexar o PTY no serviço hosts após F5 / fechar aba (não é o stash SPA). */
const SSH_RESUME_PREFIX = 'automais-host-ssh-resume:'

/** @param {string} hostId */
export function readSshResumeKey(hostId) {
  try {
    const v = localStorage.getItem(SSH_RESUME_PREFIX + hostId)
    const t = v && String(v).trim()
    return t || null
  } catch {
    return null
  }
}

/** @param {string} hostId @param {string} key */
export function writeSshResumeKey(hostId, key) {
  try {
    if (key) localStorage.setItem(SSH_RESUME_PREFIX + hostId, String(key))
  } catch {
    /* ignore */
  }
}

/** @param {string} hostId */
export function clearSshResumeKey(hostId) {
  try {
    localStorage.removeItem(SSH_RESUME_PREFIX + hostId)
  } catch {
    /* ignore */
  }
}

function getHiddenRoot() {
  let el = document.getElementById(PERSIST_ROOT_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = PERSIST_ROOT_ID
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText =
      'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;visibility:hidden'
    document.body.appendChild(el)
  }
  return el
}

function teardownPayload(p) {
  try {
    p.session?.close()
  } catch {
    /* ignore */
  }
  try {
    p.term?.dispose()
  } catch {
    /* ignore */
  }
  try {
    p.inner?.remove()
  } catch {
    /* ignore */
  }
}

/**
 * Guarda o nó do xterm fora da árvore visível (WebSocket continua aberto).
 * @param {string} hostId
 * @param {{ inner: HTMLDivElement, term: import('@xterm/xterm').Terminal, fit: import('@xterm/addon-fit').FitAddon, session: import('./hostsTerminalWebSocket').HostsTerminalSession }} payload
 */
export function stashTerminal(hostId, payload) {
  storage.set(hostId, payload)
  getHiddenRoot().appendChild(payload.inner)
}

/**
 * Retira do armazenamento (para recolocar no painel). Sem entrada válida retorna null.
 * @param {string} hostId
 */
export function takeTerminal(hostId) {
  const p = storage.get(hostId)
  if (!p) return null
  storage.delete(hostId)
  return p
}

/** Encerra PTY/WebSocket e remove lixo DOM. */
export function destroyStashedTerminal(hostId) {
  const p = storage.get(hostId)
  if (p) {
    teardownPayload(p)
    storage.delete(hostId)
  }
}

export function hasStashedTerminal(hostId) {
  return storage.has(hostId)
}

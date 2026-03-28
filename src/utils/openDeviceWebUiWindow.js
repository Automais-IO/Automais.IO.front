import { getDeviceWebUiUrl } from '../config/api'

/**
 * Abre a UI web do device numa janela popup com o mínimo de cromo do browser.
 * Usa a URL direta da API (JWT na query) para o documento ser first-party em api.automais.io;
 * assim o cookie HttpOnly da sessão da UI pode ser gravado (evita 401 em CSS/JS no iframe embutido).
 */
export function openDeviceWebUiWindow(devEui) {
  const enc = encodeURIComponent(String(devEui).trim())
  let url
  try {
    url = getDeviceWebUiUrl(devEui)
  } catch {
    return null
  }
  const w = Math.min(1280, window.screen.availWidth - 80)
  const h = Math.min(800, window.screen.availHeight - 80)
  const left = Math.max(0, Math.round((window.screen.availWidth - w) / 2))
  const top = Math.max(0, Math.round((window.screen.availHeight - h) / 2))
  const features = [
    'popup=yes',
    `width=${w}`,
    `height=${h}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ].join(',')
  const name = `automais-device-web-ui-${enc}`
  const win = window.open(url, name, features)
  if (win) win.focus()
  return win
}

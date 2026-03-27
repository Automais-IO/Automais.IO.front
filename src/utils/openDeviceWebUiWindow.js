/**
 * Abre a UI web do device numa janela popup com o mínimo de cromo do browser.
 * O destino é /devices/:deviceId/web-ui/ (rota sem Layout do painel).
 */
export function openDeviceWebUiWindow(devEui) {
  const enc = encodeURIComponent(String(devEui).trim())
  const url = `${window.location.origin}/devices/${enc}/web-ui/`
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

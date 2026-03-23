/**
 * Abre o display remoto (VNC) numa janela popup com o mínimo de cromo do browser.
 * O destino é /remote-display/:hostId (rota sem Layout do painel).
 */
export function openRemoteDisplayWindow(hostId) {
  const url = `${window.location.origin}/remote-display/${hostId}`
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
  const name = `automais-remote-display-${hostId}`
  const win = window.open(url, name, features)
  if (win) win.focus()
  return win
}

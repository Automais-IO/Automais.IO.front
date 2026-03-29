/**
 * Abre o console SSH do host em janela popup dedicada.
 * O destino é /host-console/:hostId (rota sem Layout do painel).
 */
export function openHostConsoleWindow(hostId) {
  const id = encodeURIComponent(String(hostId).trim())
  const url = `${window.location.origin}/host-console/${id}`
  const w = Math.min(1320, window.screen.availWidth - 80)
  const h = Math.min(860, window.screen.availHeight - 80)
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
  const name = `automais-host-console-${id}`
  const win = window.open(url, name, features)
  if (win) win.focus()
  return win
}

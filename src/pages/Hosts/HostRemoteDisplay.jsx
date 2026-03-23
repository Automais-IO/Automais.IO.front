import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Monitor, Loader2, X } from 'lucide-react'
import RFBImport from '@novnc/novnc/lib/rfb.js'
import { useHost } from '../../hooks/useHosts'
import { getRemoteDisplayWsUrl } from '../../config/api'

const RFB = RFBImport.default ?? RFBImport

export default function HostRemoteDisplay() {
  const { hostId } = useParams()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const rfbRef = useRef(null)
  const [status, setStatus] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')

  const { data: host, isLoading, error } = useHost(hostId)

  const canConnect = Boolean(host && host.remoteDisplayEnabled !== false)

  useEffect(() => {
    if (host?.name) {
      document.title = `${host.name} · Display`
    } else {
      document.title = 'Display remoto'
    }
    return () => {
      document.title = 'Automais IoT Platform'
    }
  }, [host?.name])

  /**
   * noVNC: se o alvo tiver 0×0 no handshake, autoscale usa scaleRatio 0 → framebuffer invisível.
   * Popups medem 0 no 1º frame; só instanciamos o RFB quando o contentor tem tamanho real.
   */
  useLayoutEffect(() => {
    if (!hostId || !canConnect) return undefined
    const el = containerRef.current
    if (!el) return undefined

    setStatus('Conectando…')
    setNeedsPassword(false)

    let rfb = null
    let cancelled = false
    let rafId = 0

    const connectWhenSized = () => {
      if (cancelled) return
      const { clientWidth, clientHeight } = el
      if (clientWidth < 2 || clientHeight < 2) {
        rafId = requestAnimationFrame(connectWhenSized)
        return
      }

      try {
        const url = getRemoteDisplayWsUrl(hostId)
        el.innerHTML = ''
        rfb = new RFB(el, url, {})
        rfb.scaleViewport = true
        rfb.resizeSession = false
        rfb.background = 'rgb(20, 20, 20)'

        rfb.addEventListener('connect', () => {
          setStatus('Conectado')
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'))
          })
        })
        rfb.addEventListener('disconnect', (ev) => {
          setStatus(
            ev.detail.clean ? 'Desconectado' : 'Conexão encerrada (rede ou servidor VNC)'
          )
        })
        rfb.addEventListener('credentialsrequired', () => {
          setNeedsPassword(true)
          setStatus('Senha VNC necessária')
        })
        rfb.addEventListener('securityfailure', (ev) => {
          const d = ev.detail || {}
          setStatus(d.reason || d.status || 'Falha de segurança na sessão VNC')
        })
        rfbRef.current = rfb
      } catch (e) {
        setStatus(e?.message || 'Erro ao iniciar o cliente de display remoto')
      }
    }

    connectWhenSized()

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      rfbRef.current = null
      try {
        rfb?.disconnect()
      } catch {
        /* ignore */
      }
      if (el) el.innerHTML = ''
    }
  }, [hostId, canConnect])

  const handleSendPassword = (e) => {
    e.preventDefault()
    const rfb = rfbRef.current
    if (!rfb || !password) return
    try {
      rfb.sendCredentials({ password: password.trim() })
      setNeedsPassword(false)
      setStatus('Autenticando…')
    } catch (err) {
      setStatus(err?.message || 'Erro ao enviar credenciais')
    }
  }

  const handleClose = () => {
    if (window.opener) {
      window.close()
      return
    }
    navigate('/hosts', { replace: true })
  }

  const shellClass =
    'fixed inset-0 z-[100] bg-[#121212] text-gray-300 overflow-hidden'

  if (isLoading) {
    return (
      <div className={`${shellClass} flex items-center justify-center gap-2`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">Carregando…</span>
      </div>
    )
  }

  if (error || !host) {
    return (
      <div className={`${shellClass} flex flex-col items-center justify-center p-6`}>
        <p className="text-red-400 text-sm text-center max-w-md">
          Não foi possível carregar o host.
        </p>
        <button type="button" className="btn btn-ghost btn-sm mt-4 text-gray-400" onClick={handleClose}>
          Fechar
        </button>
      </div>
    )
  }

  if (host.remoteDisplayEnabled === false) {
    return (
      <div className={`${shellClass} flex flex-col items-center justify-center p-6`}>
        <Monitor className="w-10 h-10 text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 text-center max-w-sm">
          Display remoto desabilitado para este host. Ative em &quot;Editar host&quot; no painel.
        </p>
        <button type="button" className="btn btn-ghost btn-sm mt-4 text-gray-400" onClick={handleClose}>
          Fechar
        </button>
      </div>
    )
  }

  return (
    <div className={`${shellClass} relative`}>
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-2 right-2 z-10 p-2 rounded-md bg-black/50 hover:bg-black/70 text-gray-400 hover:text-white transition-colors"
        title="Fechar"
        aria-label="Fechar janela de display"
      >
        <X className="w-5 h-5" />
      </button>

      {needsPassword && (
        <form
          onSubmit={handleSendPassword}
          className="absolute top-12 left-2 right-12 z-10 flex flex-wrap items-end gap-2 p-3 rounded-lg bg-black/70 border border-white/10"
        >
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Senha VNC</label>
            <input
              type="password"
              className="input w-full bg-gray-900 border-gray-700 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Enviar
          </button>
        </form>
      )}

      {status && (
        <div
          className="absolute bottom-2 left-2 right-14 z-10 text-[11px] text-gray-500 truncate pointer-events-none"
          title={status}
        >
          {status}
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0 overflow-hidden" />
    </div>
  )
}

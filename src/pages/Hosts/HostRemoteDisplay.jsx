import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Monitor, Loader2 } from 'lucide-react'
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

  /** Evita reabrir o VNC a cada refetch do React Query (novo objeto `host`). */
  const canConnect = Boolean(host && host.remoteDisplayEnabled !== false)

  useEffect(() => {
    if (!hostId || !canConnect) return undefined
    const el = containerRef.current
    if (!el) return undefined

    setStatus('Conectando…')
    setNeedsPassword(false)

    let rfb = null
    try {
      const url = getRemoteDisplayWsUrl(hostId)
      el.innerHTML = ''
      rfb = new RFB(el, url, {})
      rfb.scaleViewport = true
      rfb.resizeSession = false
      rfb.background = 'rgb(30, 30, 30)'

      rfb.addEventListener('connect', () => setStatus('Conectado'))
      rfb.addEventListener('disconnect', (ev) => {
        setStatus(
          ev.detail.clean ? 'Desconectado' : 'Conexão encerrada (rede ou servidor VNC)'
        )
      })
      rfb.addEventListener('credentialsrequired', () => {
        setNeedsPassword(true)
        setStatus('Informe a senha do VNC (se o servidor exigir)')
      })
      rfb.addEventListener('securityfailure', (ev) => {
        const d = ev.detail || {}
        setStatus(d.reason || d.status || 'Falha de segurança na sessão VNC')
      })
      rfbRef.current = rfb
    } catch (e) {
      setStatus(e?.message || 'Erro ao iniciar o cliente de display remoto')
    }

    return () => {
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

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin" />
        Carregando host…
      </div>
    )
  }

  if (error || !host) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <p className="text-red-600">Não foi possível carregar o host.</p>
        <button type="button" className="btn btn-ghost btn-sm mt-4" onClick={() => navigate('/hosts')}>
          Voltar
        </button>
      </div>
    )
  }

  if (host.remoteDisplayEnabled === false) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <button type="button" className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/hosts')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Monitor className="w-6 h-6" />
          {host.name}
        </h1>
        <p className="text-gray-600 mt-2">
          O display remoto está desabilitado para este host. Ative em &quot;Editar host&quot; no painel.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] min-h-0 overflow-hidden box-border">
      <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/hosts')}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6" />
            {host.name}
          </h1>
          <p className="text-sm text-gray-600 font-mono truncate">
            {host.vpnIp}:{host.remoteDisplayPort ?? 5900} · display remoto (VNC) · requer servidor VNC no host
          </p>
        </div>
        <div className="text-sm text-gray-500 shrink-0 max-w-full">{status}</div>
      </div>

      {needsPassword && (
        <form
          onSubmit={handleSendPassword}
          className="flex flex-wrap items-end gap-2 mb-3 shrink-0"
        >
          <div>
            <label className="label text-xs">Senha VNC</label>
            <input
              type="password"
              className="input w-56"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Enviar
          </button>
        </form>
      )}

      <p className="text-xs text-gray-500 mb-2 shrink-0">
        O tráfego passa pelo painel autenticado. Instale e inicie um servidor VNC (ex.: TigerVNC, x11vnc)
        no host escutando na porta configurada.
      </p>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full rounded-lg border border-gray-200 bg-gray-900 overflow-hidden"
      />
    </div>
  )
}

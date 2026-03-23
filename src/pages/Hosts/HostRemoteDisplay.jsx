import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Monitor, Loader2, X } from 'lucide-react'
import RFBImport from '@novnc/novnc/lib/rfb.js'
import { useHost, useRemoteDisplayCredentials } from '../../hooks/useHosts'
import { getRemoteDisplayWsUrl } from '../../config/api'

const RFB = RFBImport.default ?? RFBImport

export default function HostRemoteDisplay() {
  const { hostId } = useParams()
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const rfbRef = useRef(null)
  const [status, setStatus] = useState('')
  /** RA2ne/RSA-AES: o noVNC bloqueia até approveServer() após serververification. */
  const [serverTrustPending, setServerTrustPending] = useState(false)
  /** null | { types: string[] } — ex.: ['password'] ou ['username','password'] */
  const [authPrompt, setAuthPrompt] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  /** Após "Access is denied" com credenciais do portal — nova tentativa sem injetar senha. */
  const [skipPortalVncCreds, setSkipPortalVncCreds] = useState(false)
  const [rfbSessionKey, setRfbSessionKey] = useState(0)
  const [vncAccessDeniedHint, setVncAccessDeniedHint] = useState(false)

  const { data: host, isLoading, error } = useHost(hostId)

  const canConnect = Boolean(host && host.remoteDisplayEnabled !== false)
  const useBootstrapForVnc =
    host?.remoteDisplayUseBootstrapCredentials !== false && !skipPortalVncCreds
  const credsQuery = useRemoteDisplayCredentials(hostId, canConnect && useBootstrapForVnc)

  useEffect(() => {
    setSkipPortalVncCreds(false)
    setRfbSessionKey(0)
    setVncAccessDeniedHint(false)
  }, [hostId])

  useEffect(() => {
    if (host?.sshUsername) setUsername(host.sshUsername)
  }, [host?.sshUsername])

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
    if (credsQuery.isPending) return undefined

    const el = containerRef.current
    if (!el) return undefined

    setStatus(
      useBootstrapForVnc && credsQuery.data?.hasPassword
        ? 'Conectando… (credenciais do portal)'
        : 'Conectando…'
    )
    setServerTrustPending(false)
    setAuthPrompt(null)
    setPassword('')

    let rfb = null
    let cancelled = false
    let rafId = 0
    let sizeAttempts = 0
    /** Evita loop infinito se o contentor não medir (ex. conflito CSS); ~2s a 60fps. */
    const maxSizeAttempts = 120

    const connectWhenSized = () => {
      if (cancelled) return
      const { clientWidth, clientHeight } = el
      sizeAttempts += 1
      const tooSmall = clientWidth < 2 || clientHeight < 2
      if (tooSmall && sizeAttempts < maxSizeAttempts) {
        rafId = requestAnimationFrame(connectWhenSized)
        return
      }

      try {
        const url = getRemoteDisplayWsUrl(hostId)
        el.innerHTML = ''
        const portal = credsQuery.data
        const rfbOpts =
          useBootstrapForVnc && portal?.hasPassword && portal.password
            ? {
                credentials: {
                  username: portal.username || 'automais-io',
                  password: portal.password,
                },
              }
            : {}
        rfb = new RFB(el, url, rfbOpts)
        rfb.scaleViewport = true
        rfb.resizeSession = false
        rfb.background = 'rgb(20, 20, 20)'

        rfb.addEventListener('connect', () => {
          setVncAccessDeniedHint(false)
          setStatus('Conectado')
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'))
          })
        })
        rfb.addEventListener('disconnect', (ev) => {
          setServerTrustPending(false)
          setAuthPrompt(null)
          setStatus(
            ev.detail.clean ? 'Desconectado' : 'Conexão encerrada (rede ou servidor VNC)'
          )
        })
        rfb.addEventListener('serververification', () => {
          setServerTrustPending(true)
          setStatus(
            'Segurança RSA do VNC: confirme o servidor para continuar (TigerVNC / RA2)'
          )
        })
        rfb.addEventListener('credentialsrequired', (ev) => {
          const types = ev.detail?.types || ['password']
          setAuthPrompt({ types })
          setStatus(
            types.includes('username')
              ? 'Utilizador e senha VNC'
              : 'Senha VNC necessária'
          )
        })
        rfb.addEventListener('securityfailure', (ev) => {
          const d = ev.detail || {}
          const reason = String(d.reason || d.status || '')
          const denied =
            /denied|recusad|negad|authentication failed|auth failed/i.test(reason)
          if (denied) setVncAccessDeniedHint(true)
          setStatus(
            denied
              ? `${reason || 'Acesso negado'} — o VNC não aceitou as credenciais enviadas (utilizador/senha diferentes do SSH?).`
              : reason || 'Falha de segurança na sessão VNC'
          )
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
  }, [
    hostId,
    canConnect,
    credsQuery.isPending,
    credsQuery.data,
    useBootstrapForVnc,
    rfbSessionKey,
  ])

  const handleRetryWithoutPortalVncPassword = () => {
    setVncAccessDeniedHint(false)
    setSkipPortalVncCreds(true)
    setRfbSessionKey((k) => k + 1)
    setAuthPrompt(null)
    setServerTrustPending(false)
  }

  const handleTrustServer = () => {
    const rfb = rfbRef.current
    if (!rfb) return
    try {
      rfb.approveServer()
      setServerTrustPending(false)
      setStatus('A continuar autenticação…')
    } catch (err) {
      setStatus(err?.message || 'Erro ao confirmar servidor')
    }
  }

  const handleSendCredentials = (e) => {
    e.preventDefault()
    const rfb = rfbRef.current
    if (!rfb || !authPrompt) return
    const types = authPrompt.types
    const creds = {}
    if (types.includes('username')) creds.username = username.trim()
    if (types.includes('password')) creds.password = password.trim()
    if (types.includes('username') && !creds.username) {
      setStatus('Indique o utilizador (ex.: pi)')
      return
    }
    if (types.includes('password') && !creds.password) {
      setStatus('Indique a senha VNC')
      return
    }
    try {
      rfb.sendCredentials(creds)
      setAuthPrompt(null)
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
    <div className={shellClass}>
      <button
        type="button"
        onClick={handleClose}
        className="absolute top-2 right-2 z-10 p-2 rounded-md bg-black/50 hover:bg-black/70 text-gray-400 hover:text-white transition-colors"
        title="Fechar"
        aria-label="Fechar janela de display"
      >
        <X className="w-5 h-5" />
      </button>

      {vncAccessDeniedHint && (
        <div className="absolute top-12 left-2 right-12 z-30 flex flex-col gap-2 p-3 rounded-lg bg-red-950/90 border border-red-800/60 text-red-100 text-xs">
          <p>
            O servidor VNC recusou o login. Isto costuma acontecer quando o painel envia{' '}
            <strong>automais-io</strong> e a senha do bootstrap, mas o VNC no equipamento espera outro
            utilizador (ex.: <strong>pi</strong>) ou outra senha.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleRetryWithoutPortalVncPassword}>
              Tentar de novo sem credenciais do portal
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm text-red-200"
              onClick={() => navigate('/hosts')}
            >
              Editar host no painel
            </button>
          </div>
          <p className="text-red-200/80">
            Em <strong>Editar host</strong> podes desmarcar &quot;Enviar automaticamente utilizador/senha do
            bootstrap&quot; para este equipamento.
          </p>
        </div>
      )}

      {serverTrustPending && (
        <div className="absolute top-12 left-2 right-12 z-20 flex flex-wrap items-center gap-2 p-3 rounded-lg bg-amber-950/90 border border-amber-700/50 text-amber-100 text-xs">
          <span className="flex-1 min-w-[12rem]">
            O VNC do host pediu confiança na chave RSA (não é imagem do ecrã). Sem confirmar, a
            ligação fica parada.
          </span>
          <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={handleTrustServer}>
            Confiar e continuar
          </button>
        </div>
      )}

      {authPrompt && (
        <form
          onSubmit={handleSendCredentials}
          className="absolute top-12 left-2 right-12 z-10 flex flex-wrap items-end gap-2 p-3 rounded-lg bg-black/70 border border-white/10"
          style={{ marginTop: serverTrustPending ? '4.5rem' : undefined }}
        >
          {authPrompt.types.includes('username') && (
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Utilizador
              </label>
              <input
                type="text"
                className="input w-full bg-gray-900 border-gray-700 text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={host?.sshUsername ? host.sshUsername : 'ex.: automais-io'}
                autoComplete="username"
                autoFocus
              />
            </div>
          )}
          {authPrompt.types.includes('password') && (
            <div className="flex-1 min-w-[12rem]">
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Senha VNC
              </label>
              <input
                type="password"
                className="input w-full bg-gray-900 border-gray-700 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus={!authPrompt.types.includes('username')}
              />
            </div>
          )}
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

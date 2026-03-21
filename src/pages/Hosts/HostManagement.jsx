import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Terminal, Loader2 } from 'lucide-react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useHost } from '../../hooks/useHosts'
import { HostsTerminalSession } from '../../services/hostsTerminalWebSocket'
import {
  stashTerminal,
  takeTerminal,
  destroyStashedTerminal,
  readKeepSessionPreference,
  writeKeepSessionPreference,
  readSshResumeKey,
  writeSshResumeKey,
  clearSshResumeKey,
} from '../../services/hostTerminalPersistence'

/**
 * Estilo PuTTY: botão direito cola da área de transferência;
 * soltar o botão esquerdo após selecionar copia a seleção do xterm para o clipboard.
 */
function attachPuttyLikeClipboard(term) {
  const el = term.element
  if (!el) return () => {}

  let leftDownStartedInTerminal = false

  const onContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    void (async () => {
      try {
        const text = await navigator.clipboard.readText()
        if (text) term.paste(text)
      } catch {
        /* permissão negada ou contexto sem HTTPS */
      }
    })()
  }

  const onMouseDown = (e) => {
    if (e.button === 0) leftDownStartedInTerminal = true
  }

  const onMouseUp = (e) => {
    if (e.button !== 0) return
    const startedHere = leftDownStartedInTerminal
    leftDownStartedInTerminal = false
    if (!startedHere) return
    requestAnimationFrame(() => {
      const sel = term.getSelection()
      if (!sel) return
      void navigator.clipboard.writeText(sel).catch(() => {})
    })
  }

  el.addEventListener('contextmenu', onContextMenu)
  el.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mouseup', onMouseUp)
  return () => {
    el.removeEventListener('contextmenu', onContextMenu)
    el.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mouseup', onMouseUp)
  }
}

function createXTerm() {
  return new XTerm({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    theme: {
      background: '#0f172a',
      foreground: '#e2e8f0',
      cursor: '#94a3b8',
      black: '#0f172a',
      red: '#f87171',
      green: '#4ade80',
      yellow: '#facc15',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#f1f5f9',
      brightBlack: '#334155',
      brightRed: '#fca5a5',
      brightGreen: '#86efac',
      brightYellow: '#fde047',
      brightBlue: '#93c5fd',
      brightMagenta: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#ffffff',
    },
  })
}

export default function HostManagement() {
  const { hostId } = useParams()
  const navigate = useNavigate()
  const { data: host, isLoading, error } = useHost(hostId)

  const surfaceRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const sessionRef = useRef(null)
  const innerRef = useRef(null)
  const dataDisposableRef = useRef(null)

  const [banner, setBanner] = useState(null)
  const awaitingFirstOutputRef = useRef(true)
  const [sessionEpoch, setSessionEpoch] = useState(0)
  /** false após "Encerrar sessão"; true = terminal visível e conectado ou conectando. */
  const [sessionActive, setSessionActive] = useState(true)

  const [keepSessionOpen, setKeepSessionOpen] = useState(readKeepSessionPreference)
  const keepSessionOpenRef = useRef(keepSessionOpen)
  keepSessionOpenRef.current = keepSessionOpen

  /** Evita persistir ao sair quando o usuário pediu reinício/encerramento explícito. */
  const skipPersistNextUnmountRef = useRef(false)

  const onKeepSessionChange = (e) => {
    const v = e.target.checked
    setKeepSessionOpen(v)
    writeKeepSessionPreference(v)
  }

  useEffect(() => {
    if (!hostId || isLoading || !sessionActive || !surfaceRef.current) return undefined

    awaitingFirstOutputRef.current = true
    const surface = surfaceRef.current

    let term
    let fit
    let session
    let inner

    const stashed = takeTerminal(hostId)
    if (stashed?.session?.isOpen) {
      term = stashed.term
      fit = stashed.fit
      session = stashed.session
      inner = stashed.inner
      surface.appendChild(inner)
      innerRef.current = inner
      termRef.current = term
      fitRef.current = fit
      sessionRef.current = session
      awaitingFirstOutputRef.current = false
      setBanner(null)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            fit.fit()
            session.sendResize(term.cols, term.rows)
          } catch {
            /* ignore */
          }
        })
      })
    } else {
      if (stashed) {
        try {
          stashed.session?.close()
        } catch {
          /* ignore */
        }
        try {
          stashed.term?.dispose()
        } catch {
          /* ignore */
        }
        try {
          stashed.inner?.remove()
        } catch {
          /* ignore */
        }
      }
      inner = document.createElement('div')
      inner.className = 'h-full w-full min-h-0'
      surface.appendChild(inner)
      innerRef.current = inner

      term = createXTerm()
      fit = new FitAddon()
      term.loadAddon(fit)
      term.open(inner)
      fit.fit()

      termRef.current = term
      fitRef.current = fit

      session = new HostsTerminalSession()
      sessionRef.current = session

      setBanner('Abrindo sessão SSH e aguardando o shell remoto…')

      session
        .connect(
          hostId,
          { cols: term.cols, rows: term.rows },
          {
            onOutput: (u8) => {
              term.write(u8)
              if (awaitingFirstOutputRef.current && u8?.length > 0) {
                awaitingFirstOutputRef.current = false
                setBanner(null)
              }
            },
            onError: (msg) => {
              awaitingFirstOutputRef.current = false
              setBanner(null)
              term.writeln(`\r\n\x1b[31m${msg}\x1b[0m`)
            },
            onRemoteSessionEnded: () => {
              clearSshResumeKey(hostId)
            },
            onClose: () => {
              awaitingFirstOutputRef.current = false
              setBanner(null)
            },
          },
          {
            resumeKey: readSshResumeKey(hostId) ?? undefined,
            onClientKey: (key) => writeSshResumeKey(hostId, key),
          }
        )
        .catch((e) => {
          awaitingFirstOutputRef.current = false
          setBanner(null)
          term.writeln(`\r\n\x1b[31m${e.message}\x1b[0m\r\n`)
        })
    }

    dataDisposableRef.current = term.onData((data) => {
      session.sendInput(data)
    })

    const detachPuttyClipboard = attachPuttyLikeClipboard(term)

    const ro = new ResizeObserver(() => {
      if (!termRef.current || !fitRef.current || !sessionRef.current) return
      try {
        fitRef.current.fit()
        sessionRef.current.sendResize(termRef.current.cols, termRef.current.rows)
      } catch {
        /* ignore */
      }
    })
    ro.observe(surface)

    return () => {
      ro.disconnect()
      try {
        detachPuttyClipboard()
      } catch {
        /* ignore */
      }
      try {
        dataDisposableRef.current?.dispose()
      } catch {
        /* ignore */
      }
      dataDisposableRef.current = null

      const skip = skipPersistNextUnmountRef.current
      skipPersistNextUnmountRef.current = false

      if (skip) {
        destroyStashedTerminal(hostId)
        try {
          session?.close()
        } catch {
          /* ignore */
        }
        try {
          term?.dispose()
        } catch {
          /* ignore */
        }
        try {
          inner?.remove()
        } catch {
          /* ignore */
        }
        termRef.current = null
        fitRef.current = null
        sessionRef.current = null
        innerRef.current = null
        return
      }

      if (
        keepSessionOpenRef.current &&
        session?.isOpen &&
        inner &&
        term &&
        fit
      ) {
        try {
          inner.remove()
        } catch {
          /* ignore */
        }
        stashTerminal(hostId, { inner, term, fit, session })
        termRef.current = null
        fitRef.current = null
        sessionRef.current = null
        innerRef.current = null
        return
      }

      destroyStashedTerminal(hostId)
      try {
        session?.close()
      } catch {
        /* ignore */
      }
      try {
        term?.dispose()
      } catch {
        /* ignore */
      }
      try {
        inner?.remove()
      } catch {
        /* ignore */
      }
      termRef.current = null
      fitRef.current = null
      sessionRef.current = null
      innerRef.current = null
    }
  }, [hostId, isLoading, sessionEpoch, sessionActive])

  const handleInterrupt = () => {
    sessionRef.current?.sendInterrupt()
  }

  const handleRestartSession = () => {
    try {
      sessionRef.current?.sendTerminalClose()
    } catch {
      /* ignore */
    }
    clearSshResumeKey(hostId)
    skipPersistNextUnmountRef.current = true
    destroyStashedTerminal(hostId)
    setSessionEpoch((n) => n + 1)
  }

  const handleEndSession = () => {
    try {
      sessionRef.current?.sendTerminalClose()
    } catch {
      /* ignore */
    }
    clearSshResumeKey(hostId)
    skipPersistNextUnmountRef.current = true
    destroyStashedTerminal(hostId)
    setSessionActive(false)
  }

  const handleOpenNewSession = () => {
    setSessionActive(true)
    setSessionEpoch((n) => n + 1)
  }

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !host) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error?.message || 'Host não encontrado'}</p>
        <Link to="/hosts" className="text-primary-600 underline mt-2 inline-block">
          Voltar
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] min-h-0 overflow-hidden box-border">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/hosts')}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6" />
            {host.name}
          </h1>
          <p className="text-sm text-gray-600 font-mono truncate">
            {host.vpnIp}:{host.sshPort} · {host.sshUsername} · shell interativo (PTY)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
          {sessionActive && (
            <>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleInterrupt}>
                Interromper (Ctrl+C)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={handleRestartSession}>
                Reiniciar sessão
              </button>
              <button type="button" className="btn btn-outline btn-sm text-red-700 border-red-300 hover:bg-red-50" onClick={handleEndSession}>
                Encerrar sessão
              </button>
            </>
          )}
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-gray-600 mb-2 shrink-0 cursor-pointer select-none">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          checked={keepSessionOpen}
          onChange={onKeepSessionChange}
        />
        <span>
          Manter sessão ao sair desta tela — o navegador mantém o WebSocket ao navegar no painel; ao
          voltar, o terminal reaparece como estava. A sessão SSH de verdade fica só entre o serviço
          hosts (Python) e o equipamento remoto; a API e o front só autenticam e encaminham. Após F5
          ou fechar a aba o WebSocket cai, mas o Python pode manter o PTY destacado: este painel
          guarda uma chave local por host para você reanexar (outro host ou perfil usa outra chave).
          Use &quot;Encerrar sessão&quot; para encerrar o SSH no serviço hosts.
        </span>
      </label>

      <p className="text-xs text-gray-500 mb-2 shrink-0">
        Terminal estilo PuTTY: selecione com o botão esquerdo e solte para copiar; botão direito cola
        da área de transferência. Duas abas no mesmo host reanexam à mesma sessão no serviço hosts (a
        última conexão assume o fluxo). <span className="font-medium text-gray-600">Encerrar sessão</span>{' '}
        manda encerramento explícito até o Python fechar o PTY.{' '}
        <span className="font-medium text-gray-600">Reiniciar sessão</span> encerra o shell atual lá e abre outro.
      </p>

      {sessionActive ? (
        <div className="relative flex-1 min-h-0 min-w-0 rounded-lg border border-gray-700 overflow-hidden bg-slate-900 p-1">
          {banner && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/92 px-4 text-center"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader2 className="h-10 w-10 shrink-0 animate-spin text-primary-500" />
              <p className="text-sm text-gray-200 max-w-sm">{banner}</p>
            </div>
          )}
          <div ref={surfaceRef} className="h-full w-full min-h-0" />
        </div>
      ) : (
        <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-gray-400 bg-slate-100 text-gray-700">
          <p className="text-sm text-center px-4">Sessão SSH encerrada neste painel.</p>
          <button type="button" className="btn btn-primary" onClick={handleOpenNewSession}>
            Abrir nova sessão
          </button>
        </div>
      )}
    </div>
  )
}

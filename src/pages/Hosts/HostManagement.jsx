import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link, useBlocker } from 'react-router-dom'
import { ArrowLeft, Terminal, Loader2, X } from 'lucide-react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useHost } from '../../hooks/useHosts'
import { HostsTerminalSession } from '../../services/hostsTerminalWebSocket'
import Modal from '../../components/Modal/Modal'
import {
  stashTerminal,
  takeTerminal,
  destroyStashedTerminal,
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
  const [isPopup] = useState(
    () => typeof window !== 'undefined' && Boolean(window.opener)
  )

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

  /** Evita persistir ao sair quando o usuário pediu reinício/encerramento explícito. */
  const skipPersistNextUnmountRef = useRef(false)

  /** true = manter stash ao sair (modal Sim); false = encerrar (modal Não); null = cancelar / não passou pelo modal. */
  const stashOnLeaveChoiceRef = useRef(null)
  const [popupCloseConfirmOpen, setPopupCloseConfirmOpen] = useState(false)

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (isPopup) return false
    if (!sessionActive || !sessionRef.current?.isOpen) return false
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    )
  })

  useEffect(() => {
    if (!sessionActive) return undefined
    const onBeforeUnload = (e) => {
      if (!sessionRef.current?.isOpen) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [sessionActive])

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

      const stashChoice = stashOnLeaveChoiceRef.current
      stashOnLeaveChoiceRef.current = null

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
        stashChoice === true &&
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

  const handleLeaveModalCancel = () => {
    stashOnLeaveChoiceRef.current = null
    if (blocker.state === 'blocked') blocker.reset()
  }

  const handleLeaveKeepSession = () => {
    stashOnLeaveChoiceRef.current = true
    if (blocker.state === 'blocked') blocker.proceed()
  }

  const handleLeaveDiscardSession = () => {
    try {
      sessionRef.current?.sendTerminalClose()
    } catch {
      /* ignore */
    }
    clearSshResumeKey(hostId)
    stashOnLeaveChoiceRef.current = false
    if (blocker.state === 'blocked') blocker.proceed()
  }

  const closeConsoleWindow = () => {
    if (window.opener) {
      window.close()
      return
    }
    navigate('/hosts', { replace: true })
  }

  const handlePopupClose = () => {
    if (!isPopup) {
      navigate('/hosts')
      return
    }
    if (sessionActive && sessionRef.current?.isOpen) {
      setPopupCloseConfirmOpen(true)
      return
    }
    closeConsoleWindow()
  }

  const handlePopupKeepSession = () => {
    setPopupCloseConfirmOpen(false)
    closeConsoleWindow()
  }

  const handlePopupDiscardSession = () => {
    setPopupCloseConfirmOpen(false)
    try {
      sessionRef.current?.sendTerminalClose()
    } catch {
      /* ignore */
    }
    clearSshResumeKey(hostId)
    skipPersistNextUnmountRef.current = true
    destroyStashedTerminal(hostId)
    setSessionActive(false)
    closeConsoleWindow()
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
    <div
      className={
        isPopup
          ? 'fixed inset-0 z-[100] bg-white p-4 flex flex-col min-h-0 overflow-hidden box-border'
          : 'p-6 max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] min-h-0 overflow-hidden box-border'
      }
    >
      {isPopup && (
        <button
          type="button"
          onClick={handlePopupClose}
          className="absolute top-2 right-2 z-20 p-2 rounded-md bg-black/50 hover:bg-black/70 text-gray-300 hover:text-white transition-colors"
          title="Fechar"
          aria-label="Fechar janela do console SSH"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handlePopupClose}
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

      <Modal
        isOpen={blocker.state === 'blocked'}
        onClose={handleLeaveModalCancel}
        title="Sair do console"
      >
        <div className="space-y-4">
          <p className="text-gray-700">Deseja manter a sessão ativa?</p>
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLeaveModalCancel}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleLeaveDiscardSession}
            >
              Não
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleLeaveKeepSession}
            >
              Sim
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={popupCloseConfirmOpen}
        onClose={() => setPopupCloseConfirmOpen(false)}
        title="Fechar console SSH"
      >
        <div className="space-y-4">
          <p className="text-gray-700">Deseja manter a sessão ativa?</p>
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setPopupCloseConfirmOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handlePopupDiscardSession}
            >
              Não
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePopupKeepSession}
            >
              Sim
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

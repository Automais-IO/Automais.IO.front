import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Terminal, Loader2 } from 'lucide-react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useHost } from '../../hooks/useHosts'
import { HostsTerminalSession } from '../../services/hostsTerminalWebSocket'

export default function HostManagement() {
  const { hostId } = useParams()
  const navigate = useNavigate()
  const { data: host, isLoading, error } = useHost(hostId)

  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)
  const sessionRef = useRef(null)
  const [banner, setBanner] = useState(null)
  /** Incrementa para encerrar WebSocket + PTY no servidor e montar terminal novo. */
  const [sessionEpoch, setSessionEpoch] = useState(0)

  useEffect(() => {
    if (!hostId || isLoading || !containerRef.current) return undefined

    const el = containerRef.current
    const term = new XTerm({
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
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(el)
    fit.fit()

    termRef.current = term
    fitRef.current = fit

    const session = new HostsTerminalSession()
    sessionRef.current = session

    setBanner('Conectando ao shell…')

    session
      .connect(
        hostId,
        { cols: term.cols, rows: term.rows },
        {
          onOutput: (u8) => {
            term.write(u8)
          },
          onError: (msg) => {
            setBanner(null)
            term.writeln(`\r\n\x1b[31m${msg}\x1b[0m`)
          },
          onClose: () => {
            setBanner(null)
          },
        }
      )
      .then(() => {
        setBanner(null)
      })
      .catch((e) => {
        setBanner(null)
        term.writeln(`\r\n\x1b[31m${e.message}\x1b[0m\r\n`)
      })

    term.onData((data) => {
      session.sendInput(data)
    })

    const ro = new ResizeObserver(() => {
      if (!termRef.current || !fitRef.current || !sessionRef.current) return
      try {
        fitRef.current.fit()
        sessionRef.current.sendResize(termRef.current.cols, termRef.current.rows)
      } catch (_) {
        /* ignore */
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      session.close()
      term.dispose()
      termRef.current = null
      fitRef.current = null
      sessionRef.current = null
    }
  }, [hostId, isLoading, sessionEpoch])

  const handleInterrupt = () => {
    sessionRef.current?.sendInterrupt()
  }

  const handleRestartSession = () => {
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
    <div className="p-6 max-w-6xl mx-auto flex flex-col min-h-[calc(100vh-4rem)]">
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
          <button type="button" className="btn btn-outline btn-sm" onClick={handleInterrupt}>
            Interromper (Ctrl+C)
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleRestartSession}>
            Reiniciar sessão
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2 shrink-0">
        Terminal como no PuTTY: saída em tempo real, Enter e Ctrl+C normais.{' '}
        <span className="font-medium text-gray-600">Reiniciar sessão</span> fecha o WebSocket e o
        shell no Linux e abre uma conexão nova. O serviço{' '}
        <code className="text-gray-600">Automais.IO.hosts</code> mantém o SSH na VPN.
      </p>
      {banner && (
        <p className="text-sm text-amber-700 mb-2 shrink-0 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {banner}
        </p>
      )}

      <div
        ref={containerRef}
        className="flex-1 min-h-[420px] rounded-lg border border-gray-700 overflow-hidden bg-slate-900 p-1"
      />
    </div>
  )
}

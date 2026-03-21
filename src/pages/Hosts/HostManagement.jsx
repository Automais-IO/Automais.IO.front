import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Terminal, Loader2 } from 'lucide-react'
import { useHost } from '../../hooks/useHosts'
import { hostsWebSocketService } from '../../services/hostsWebSocketService'

function formatSshResult(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  const stdout = data.stdout ?? ''
  const stderr = data.stderr ?? ''
  const code = data.exitCode ?? data.exit_code
  let out = ''
  if (code !== undefined && code !== null) out += `(exit ${code})\n`
  if (stdout) out += stdout
  if (stderr) out += (out ? '\n' : '') + `[stderr]\n${stderr}`
  return out || JSON.stringify(data, null, 2)
}

export default function HostManagement() {
  const { hostId } = useParams()
  const navigate = useNavigate()
  const { data: host, isLoading, error } = useHost(hostId)

  const [terminalCommand, setTerminalCommand] = useState('')
  const [terminalHistory, setTerminalHistory] = useState([])
  const [executing, setExecuting] = useState(false)
  const [wsError, setWsError] = useState(null)

  useEffect(() => {
    return () => hostsWebSocketService.disconnect()
  }, [hostId])

  const runCommand = async () => {
    if (!terminalCommand.trim() || executing || !hostId) return
    setExecuting(true)
    setWsError(null)
    const cmd = terminalCommand.trim()
    try {
      const result = await hostsWebSocketService.executeCommand(hostId, cmd)
      const payload = result.data ?? result
      const text = formatSshResult(payload)
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'command', content: cmd },
        { type: 'result', content: text || '(sem saída)' },
      ])
      setTerminalCommand('')
    } catch (e) {
      setWsError(e.message)
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'command', content: cmd },
        { type: 'error', content: e.message },
      ])
    } finally {
      setExecuting(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runCommand()
    }
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/hosts')}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Terminal className="w-6 h-6" />
            {host.name}
          </h1>
          <p className="text-sm text-gray-600 font-mono">
            {host.vpnIp}:{host.sshPort} · {host.sshUsername}
          </p>
        </div>
      </div>

      <div className="card bg-gray-900 text-gray-100 p-4 min-h-[320px] flex flex-col">
        <p className="text-xs text-gray-500 mb-2">
          Comandos via SSH no IP da VPN. A API só abre o WebSocket depois de conectar ao
          serviço <code className="text-gray-400">Automais.IO.hosts</code> em{' '}
          <code className="text-gray-400">127.0.0.1:8766</code> (mesmo servidor). Se o
          handshake falhar, verifique o processo Python, Nginx{' '}
          <code className="text-gray-400">/api/ws/hosts/</code> e a resposta HTTP (ex.: 503
          no DevTools).
        </p>
        {wsError && (
          <p className="text-amber-400 text-sm mb-2">
            Último erro: {wsError}
          </p>
        )}
        <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2 mb-3 max-h-[400px]">
          {terminalHistory.length === 0 && (
            <span className="text-gray-500">Digite um comando (ex: uname -a)</span>
          )}
          {terminalHistory.map((item, i) => (
            <div key={i}>
              {item.type === 'command' && (
                <div className="text-green-400">$ {item.content}</div>
              )}
              {item.type === 'result' && (
                <pre className="whitespace-pre-wrap text-gray-300">{item.content}</pre>
              )}
              {item.type === 'error' && (
                <div className="text-red-400">{item.content}</div>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1 bg-gray-800 border-gray-700 text-white font-mono text-sm"
            placeholder="comando…"
            value={terminalCommand}
            onChange={(e) => setTerminalCommand(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={executing}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={runCommand}
            disabled={executing || !terminalCommand.trim()}
          >
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Executar'}
          </button>
        </div>
      </div>
    </div>
  )
}

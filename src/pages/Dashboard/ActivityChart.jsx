import { useRouters } from '../../hooks/useRouters'

function formatBytes(n) {
  if (n == null || n === 0) return '0 B'
  const num = Number(n)
  if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`
  if (num >= 1048576) return `${(num / 1048576).toFixed(2)} MB`
  if (num >= 1024) return `${(num / 1024).toFixed(2)} KB`
  return `${num} B`
}

export default function ActivityChart() {
  const { data: routers, isLoading } = useRouters()
  const online = (routers || []).filter((r) => r.status === 'Online')

  return (
    <div className="card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Atividade semanal</h3>
        <p className="text-xs text-gray-500 mt-1">
          Routers online agora — IP VPN, tráfego (Rx/Tx) e latência
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-500 py-8 text-center">Carregando routers…</p>
      ) : online.length === 0 ? (
        <p className="text-xs text-gray-500 py-8 text-center">
          Nenhum router online no momento
        </p>
      ) : (
        <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {online.map((r) => {
            const ip = r.vpnTunnelIp || '—'
            const rx = formatBytes(r.wireGuardBytesReceived)
            const tx = formatBytes(r.wireGuardBytesSent)
            const lat =
              r.latency != null && r.latency !== ''
                ? `${r.latency} ms`
                : '—'
            return (
              <li
                key={r.id}
                className="text-[11px] leading-snug text-gray-600 border-b border-gray-100 pb-2 last:border-0"
              >
                <span className="font-medium text-gray-800">{r.name}</span>
                {' · '}
                <span className="text-gray-500">IP</span> {ip}
                {' · '}
                <span className="text-gray-500">Rx</span> {rx}
                {' · '}
                <span className="text-gray-500">Tx</span> {tx}
                {' · '}
                <span className="text-gray-500">lat.</span> {lat}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

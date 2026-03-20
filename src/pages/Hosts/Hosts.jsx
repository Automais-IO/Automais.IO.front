import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Plus, Search, Trash2, Edit, Terminal } from 'lucide-react'
import { useHosts, useDeleteHost } from '../../hooks/useHosts'
import HostModal from '../../components/Modal/HostModal'
import clsx from 'clsx'

const statusLabels = {
  Online: { label: 'Online', color: 'badge-success' },
  Offline: { label: 'Offline', color: 'badge-gray' },
  Maintenance: { label: 'Manutenção', color: 'badge-warning' },
  Error: { label: 'Erro', color: 'badge-error' },
}

const kindLabels = {
  LinuxUbuntu: 'Linux Ubuntu',
}

export default function Hosts() {
  const navigate = useNavigate()
  const { data: hosts, isLoading, error, refetch } = useHosts()
  const deleteHost = useDeleteHost()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = (hosts || []).filter(
    (h) =>
      !search ||
      h.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.vpnIp?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remover o host "${name}"?`)) return
    try {
      await deleteHost.mutateAsync(id)
    } catch (e) {
      alert(e.message || 'Erro ao remover')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Server className="w-8 h-8" />
            Hosts
          </h1>
          <p className="text-gray-600 mt-1">
            Servidores Linux (Ubuntu) na VPN — console via SSH
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary inline-flex items-center gap-2"
          onClick={() => {
            setSelected(null)
            setModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Novo host
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por nome ou IP…"
          className="input w-full pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && <p className="text-gray-500">Carregando…</p>}
      {error && (
        <p className="text-red-600">
          {error.message}
          <button type="button" className="ml-2 underline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </p>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <p className="text-gray-500">Nenhum host cadastrado.</p>
      )}

      <div className="grid gap-3">
        {filtered.map((h) => {
          const st = statusLabels[h.status] || statusLabels.Offline
          return (
            <div
              key={h.id}
              className="card bg-white border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer hover:border-primary-300"
              onClick={() => navigate(`/hosts/${h.id}/management`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/hosts/${h.id}/management`)
              }}
            >
              <div>
                <div className="font-semibold text-gray-900">{h.name}</div>
                <div className="text-sm text-gray-600 font-mono">{h.vpnIp}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {kindLabels[h.hostKind] || h.hostKind} · SSH {h.sshPort} ·{' '}
                  {h.sshUsername}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={clsx('badge', st.color)}>{st.label}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/hosts/${h.id}/management`)
                  }}
                >
                  <Terminal className="w-4 h-4" />
                  Console
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(h)
                    setModalOpen(true)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(h.id, h.name)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <HostModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelected(null)
        }}
        host={selected}
      />
    </div>
  )
}

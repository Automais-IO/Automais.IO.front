import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getDeviceWebUiUrl } from '../../config/api'

export default function DeviceWebUi() {
  const { deviceId, '*': splat } = useParams()

  const iframeSrc = useMemo(() => {
    if (!deviceId) return null
    try {
      return getDeviceWebUiUrl(deviceId, splat || '')
    } catch {
      return null
    }
  }, [deviceId, splat])

  if (!deviceId) {
    return (
      <div className="p-6">
        <p className="text-gray-700">Dispositivo inválido.</p>
        <Link to="/devices" className="text-primary-600 text-sm mt-2 inline-block">
          Voltar para Devices
        </Link>
      </div>
    )
  }

  if (!iframeSrc) {
    return (
      <div className="p-6">
        <p className="text-red-600">Não foi possível abrir a interface (sessão expirada?).</p>
        <Link to="/devices" className="text-primary-600 text-sm mt-2 inline-block">
          Voltar para Devices
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <Link
          to="/devices"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Devices
        </Link>
        <span className="text-xs text-gray-500 font-mono truncate" title={deviceId}>
          {deviceId}
        </span>
      </header>
      <iframe
        title="Interface web do device"
        src={iframeSrc}
        className="flex-1 w-full border-0 min-h-0"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
      />
    </div>
  )
}

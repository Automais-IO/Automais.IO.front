import { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { getDeviceWebUiUrl } from '../../config/api'

export default function DeviceWebUi() {
  const { deviceId, '*': splat } = useParams()
  const navigate = useNavigate()
  const [isPopup] = useState(
    () => typeof window !== 'undefined' && Boolean(window.opener)
  )

  const iframeSrc = useMemo(() => {
    if (!deviceId) return null
    try {
      return getDeviceWebUiUrl(deviceId, splat || '')
    } catch {
      return null
    }
  }, [deviceId, splat])

  const handleClose = () => {
    if (window.opener) {
      window.close()
      return
    }
    navigate('/devices', { replace: true })
  }

  const popupShell = 'fixed inset-0 z-[100] bg-gray-100 overflow-hidden flex flex-col'

  if (!deviceId) {
    return (
      <div className={isPopup ? `${popupShell} items-center justify-center p-6` : 'p-6'}>
        <p className="text-gray-700">Dispositivo inválido.</p>
        {isPopup ? (
          <button type="button" className="btn btn-ghost btn-sm mt-4 text-gray-600" onClick={handleClose}>
            Fechar
          </button>
        ) : (
          <Link to="/devices" className="text-primary-600 text-sm mt-2 inline-block">
            Voltar para Devices
          </Link>
        )}
      </div>
    )
  }

  if (!iframeSrc) {
    return (
      <div className={isPopup ? `${popupShell} items-center justify-center p-6` : 'p-6'}>
        <p className="text-red-600">Não foi possível abrir a interface (sessão expirada?).</p>
        {isPopup ? (
          <button type="button" className="btn btn-ghost btn-sm mt-4 text-gray-600" onClick={handleClose}>
            Fechar
          </button>
        ) : (
          <Link to="/devices" className="text-primary-600 text-sm mt-2 inline-block">
            Voltar para Devices
          </Link>
        )}
      </div>
    )
  }

  if (isPopup) {
    return (
      <div className={popupShell}>
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 p-2 rounded-md bg-black/50 hover:bg-black/70 text-gray-300 hover:text-white transition-colors"
          title="Fechar"
          aria-label="Fechar janela da UI do device"
        >
          <X className="w-5 h-5" />
        </button>
        <iframe
          title="Interface web do device"
          src={iframeSrc}
          className="flex-1 w-full min-h-0 border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
        />
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
        <span className="text-xs text-gray-500 font-mono truncate" title={`DevEUI ${deviceId}`}>
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

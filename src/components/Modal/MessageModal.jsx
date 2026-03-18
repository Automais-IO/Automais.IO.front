import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import Modal from './Modal'

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const colorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
}

const bgColorMap = {
  success: 'bg-green-50',
  error: 'bg-red-50',
  warning: 'bg-yellow-50',
  info: 'bg-blue-50',
}

export default function MessageModal({ isOpen, onClose, type = 'info', title, message }) {
  if (!isOpen) return null

  const Icon = iconMap[type] || iconMap.info
  const iconColor = colorMap[type] || colorMap.info
  const bgColor = bgColorMap[type] || bgColorMap.info

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || (type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : type === 'warning' ? 'Atenção' : 'Informação')}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <p className="text-gray-700">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="btn btn-primary"
        >
          OK
        </button>
      </div>
    </Modal>
  )
}


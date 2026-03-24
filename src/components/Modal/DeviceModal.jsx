import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useCreateDevice } from '../../hooks/useDevices'

/** Valores como a API .NET espera (JsonStringEnumConverter + nome do enum). */
const KIND_OPTIONS = [
  { value: 'LoRaWan', label: 'LoRaWAN' },
  { value: 'Mqtt', label: 'MQTT' },
  { value: 'CustomApi', label: 'Custom API' },
]

export default function DeviceModal({ isOpen, onClose, applications = [] }) {
  const createDevice = useCreateDevice()

  const [formData, setFormData] = useState({
    applicationId: '',
    name: '',
    devEui: '',
    description: '',
    kind: 'LoRaWan',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isOpen) return
    const first = applications[0]?.id
    setFormData((prev) => ({
      ...prev,
      applicationId: prev.applicationId || (first ? String(first) : ''),
    }))
  }, [isOpen, applications])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.applicationId?.trim()) {
      newErrors.applicationId = 'Selecione uma application'
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }
    const raw = formData.devEui.trim()
    if (!raw) {
      newErrors.devEui = 'Identificador (DevEUI) é obrigatório'
    } else if (raw.length > 128) {
      newErrors.devEui = 'Máximo 128 caracteres'
    } else if (formData.kind === 'LoRaWan') {
      const eui = raw.replace(/[-\s:]/g, '')
      if (!/^[0-9A-Fa-f]+$/.test(eui)) {
        newErrors.devEui = 'LoRaWAN: use apenas hex (0-9, A-F) e separadores opcionais'
      } else if (eui.length !== 16) {
        newErrors.devEui = 'LoRaWAN: DevEUI deve ter 16 caracteres hex (8 bytes)'
      }
    } else if (!/^[\w.\-:]+$/i.test(raw)) {
      newErrors.devEui = 'Use letras, números, ponto, hífen, dois-pontos ou sublinhado'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const rawDev = formData.devEui.trim()
    const devEui =
      formData.kind === 'LoRaWan'
        ? rawDev.replace(/[-\s:]/g, '').toUpperCase()
        : rawDev
    const payload = {
      applicationId: formData.applicationId,
      name: formData.name.trim(),
      devEui,
      description: formData.description.trim() || null,
      kind: formData.kind,
      vpnEnabled: false,
    }

    try {
      await createDevice.mutateAsync(payload)
      onClose()
      setFormData({
        applicationId: applications[0]?.id ? String(applications[0].id) : '',
        name: '',
        devEui: '',
        description: '',
        kind: 'LoRaWan',
      })
      setErrors({})
    } catch (error) {
      alert(error.message || 'Erro ao criar device')
    }
  }

  const noApps = !applications?.length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo device">
      <form onSubmit={handleSubmit} className="space-y-4">
        {noApps ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            Cadastre pelo menos uma <strong>Application</strong> antes de criar um device.
          </p>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application <span className="text-red-500">*</span>
          </label>
          <select
            name="applicationId"
            value={formData.applicationId}
            onChange={handleChange}
            disabled={noApps}
            className={`input w-full ${errors.applicationId ? 'border-red-500' : ''}`}
          >
            <option value="">Selecione…</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
          {errors.applicationId && (
            <p className="mt-1 text-sm text-red-600">{errors.applicationId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
            placeholder="Ex: Sensor sala 3"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DevEUI <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="devEui"
            value={formData.devEui}
            onChange={handleChange}
            className={`input w-full font-mono ${errors.devEui ? 'border-red-500' : ''}`}
            placeholder="16 caracteres hex, ex: A1B2C3D4E5F60708"
            autoComplete="off"
          />
          {errors.devEui && <p className="mt-1 text-sm text-red-600">{errors.devEui}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select
            name="kind"
            value={formData.kind}
            onChange={handleChange}
            className="input w-full"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            className="input w-full"
            placeholder="Opcional"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={noApps || createDevice.isPending}
          >
            {createDevice.isPending ? 'Salvando…' : 'Criar device'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

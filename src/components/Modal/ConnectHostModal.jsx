import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Copy, Loader2, AlertCircle, RefreshCw, Wifi, Terminal } from 'lucide-react'
import Modal from './Modal'
import { hostsApi } from '../../services/hostsApi'

const POLL_INTERVAL = 5000
const SETUP_TIMEOUT_MS = 10 * 60 * 1000

const steps = [
  { key: 'waiting', label: 'Aguardando execução do script no host…' },
  { key: 'vpn', label: 'VPN conectada!' },
  { key: 'ssh', label: 'SSH acessível — host provisionado!' },
]

export default function ConnectHostModal({ isOpen, onClose, host }) {
  const isWindowsHost = host?.hostKind === 'Windows'
  const [setupUrl, setSetupUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(false)
  const pollingRef = useRef(null)
  const startTimeRef = useRef(null)

  const wgetCommand = setupUrl
    ? `sudo wget -qO- "${setupUrl}" | sudo bash`
    : ''

  const activate = useCallback(async () => {
    if (!host?.id) return
    if (host.hostKind === 'Windows') {
      setSetupUrl(null)
      setError(null)
      setExpired(false)
      setCurrentStep(0)
      setCopied(false)
      return
    }
    setLoading(true)
    setError(null)
    setExpired(false)
    setCurrentStep(0)
    setCopied(false)
    try {
      const result = await hostsApi.activateSetup(host.id)
      setSetupUrl(result.url)
      startTimeRef.current = Date.now()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao ativar setup')
    } finally {
      setLoading(false)
    }
  }, [host?.id, host?.hostKind])

  useEffect(() => {
    if (isOpen && host?.id) {
      activate()
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isOpen, host?.id, activate])

  useEffect(() => {
    if (!isOpen || isWindowsHost || !setupUrl || currentStep >= 2) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    pollingRef.current = setInterval(async () => {
      if (startTimeRef.current && Date.now() - startTimeRef.current > SETUP_TIMEOUT_MS) {
        setExpired(true)
        clearInterval(pollingRef.current)
        return
      }

      try {
        const updated = await hostsApi.getById(host.id)
        if (updated.status === 'Online' && currentStep < 1) {
          setCurrentStep(1)
        }
        if (updated.provisioningStatus === 'Ready') {
          setCurrentStep(2)
          clearInterval(pollingRef.current)
        } else if (updated.provisioningStatus === 'Error') {
          setError('Erro durante provisionamento do host.')
          clearInterval(pollingRef.current)
        }
      } catch {
        // ignora erros de polling
      }
    }, POLL_INTERVAL)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isOpen, setupUrl, host?.id, currentStep, isWindowsHost])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wgetCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = wgetCommand
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleClose = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    setSetupUrl(null)
    setCurrentStep(0)
    setError(null)
    setExpired(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Conectar host: ${host?.name || ''}`}>
      <div className="space-y-6 max-w-lg">
        {loading && (
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            Preparando setup…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                type="button"
                className="mt-2 text-sm text-red-600 underline"
                onClick={activate}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {isWindowsHost && !error && (
          <>
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-blue-900 font-medium">
                Fluxo Windows (agente órfão)
              </p>
              <p className="text-sm text-blue-800">
                1. Instale o aplicativo <strong>Automais.IO.remote</strong> no host Windows.
              </p>
              <p className="text-sm text-blue-800">
                2. O agente mostra um código de instalação.
              </p>
              <p className="text-sm text-blue-800">
                3. No painel, edite/crie o host Windows informando esse código.
              </p>
              <p className="text-sm text-blue-800">
                4. Após o vínculo, o agente recebe configuração VPN automaticamente e inicia o túnel.
              </p>
            </div>
          </>
        )}

        {setupUrl && !error && !isWindowsHost && (
          <>
            <div>
              <p className="text-sm text-gray-700 mb-3">
                Execute o comando abaixo no terminal do host como <strong>root</strong>:
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {wgetCommand}
                </pre>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  title="Copiar comando"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-1">Comando copiado!</p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Status do provisionamento</p>
              <div className="space-y-3">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStep
                  const isCurrent = idx === currentStep && currentStep < 2
                  const isPending = idx > currentStep
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      {isDone && (
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                      )}
                      {isCurrent && !expired && (
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        </div>
                      )}
                      {isCurrent && expired && (
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                      {isPending && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>
                      )}
                      <span
                        className={
                          isDone
                            ? 'text-sm text-green-700 font-medium'
                            : isCurrent
                              ? 'text-sm text-gray-900'
                              : 'text-sm text-gray-400'
                        }
                      >
                        {idx === 1 && <Wifi className="w-4 h-4 inline mr-1" />}
                        {idx === 2 && <Terminal className="w-4 h-4 inline mr-1" />}
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {expired && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800">
                    O link do script expirou (10 minutos). Clique abaixo para gerar um novo.
                  </p>
                  <button
                    type="button"
                    className="mt-2 btn btn-sm btn-primary inline-flex items-center gap-1"
                    onClick={activate}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Gerar novo link
                  </button>
                </div>
              </div>
            )}

            {currentStep >= 2 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">Host conectado e provisionado com sucesso!</p>
                <p className="text-sm text-green-700 mt-1">
                  VPN ativa e SSH acessível. O host já aparece como Online.
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-2">
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            {currentStep >= 2 ? 'Fechar' : 'Fechar (continua em segundo plano)'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

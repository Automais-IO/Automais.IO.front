import { 
  Activity, 
  Cpu, 
  Radio, 
  Users,
  TrendingUp,
  TrendingDown,
  Signal,
  AlertCircle,
} from 'lucide-react'
import StatCard from './StatCard'
import RecentDevices from './RecentDevices'
import ActivityChart from './ActivityChart'
import GatewayStatus from './GatewayStatus'
import { useTenant } from '../../hooks/useTenant'
import { useAuth } from '../../contexts/AuthContext'

export default function Dashboard() {
  const { data: tenant, isLoading: isLoadingTenant } = useTenant()
  const { user } = useAuth()

  const stats = [
    {
      name: 'Devices Ativos',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: Cpu,
      color: 'primary',
    },
    {
      name: 'Gateways Online',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: Radio,
      color: 'success',
    },
    {
      name: 'Mensagens Hoje',
      value: '0',
      change: '0%',
      trend: 'neutral',
      icon: Activity,
      color: 'secondary',
    },
    {
      name: 'Alertas Ativos',
      value: '0',
      change: '0',
      trend: 'neutral',
      icon: AlertCircle,
      color: 'warning',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Visão geral da sua infraestrutura IoT
            </p>
          </div>
          {tenant && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-semibold text-sm">
                {tenant.name
                  ? tenant.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : '??'}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {tenant.name || 'Carregando...'}
                </div>
                {tenant.slug && (
                  <div className="text-xs text-gray-500">
                    {tenant.slug}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.name} {...stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityChart />
        <GatewayStatus />
      </div>

      {/* Recent Devices */}
      <RecentDevices />
    </div>
  )
}


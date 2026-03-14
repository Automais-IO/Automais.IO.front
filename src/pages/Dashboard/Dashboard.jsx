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

export default function Dashboard() {
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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Visão geral da sua infraestrutura IoT
        </p>
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


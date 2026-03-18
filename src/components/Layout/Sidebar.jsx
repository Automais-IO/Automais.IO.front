import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Cpu,
  Radio,
  Users,
  Shield,
  Settings,
  LogOut,
  Network,
} from 'lucide-react'
import clsx from 'clsx'
import { useTenant } from '../../hooks/useTenant'
import { useAuth } from '../../contexts/AuthContext'
import BrandLogo from '../BrandLogo'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Applications', href: '/applications', icon: Package },
  { name: 'Devices', href: '/devices', icon: Cpu },
  { name: 'Gateways', href: '/gateways', icon: Radio },
  { name: 'Routers', href: '/routers', icon: Network },
  { name: 'Usuários', href: '/users', icon: Users },
  { name: 'VPN', href: '/vpn', icon: Shield },
]

export default function Sidebar() {
  const { data: tenant, isLoading: isLoadingTenant } = useTenant()
  const { user } = useAuth()

  // Gerar iniciais do tenant a partir do nome
  const getTenantInitials = (name) => {
    if (!name) return '??'
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Obter role do usuário (pode vir do backend ou ser mapeado)
  const getUserRole = () => {
    // TODO: Quando o backend retornar a role do usuário, usar aqui
    // Por enquanto, retornar 'Owner' como padrão
    return user?.role || 'Owner'
  }

  const tenantInitials = tenant?.name ? getTenantInitials(tenant.name) : '??'
  const tenantName = tenant?.name || 'Carregando...'
  const userRole = getUserRole()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex flex-col flex-grow bg-gradient-purple overflow-y-auto shadow-purple-lg">
        <div className="flex justify-center py-5 px-3 border-b border-white/10">
          <div className="flex flex-col items-end">
            <BrandLogo
              className="h-[4em] w-auto max-w-[min(100%,280px)] object-contain object-right drop-shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
              alt="Automais"
            />
            <span className="mt-2 text-[10px] sm:text-[11px] font-medium tracking-wide text-white">
              IoT Platform
            </span>
          </div>
        </div>

        {/* Tenant Info */}
        <div className="px-4 py-4 bg-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-white font-semibold">
              {isLoadingTenant ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                tenantInitials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {isLoadingTenant ? 'Carregando...' : tenantName}
              </div>
              <div className="text-xs text-primary-100">
                {userRole}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-white text-primary-700 shadow-lg'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-4">
          <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-primary-100 hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200">
            <Settings className="w-5 h-5" />
            Configurações
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-primary-100 hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}


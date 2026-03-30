import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Applications from './pages/Applications/Applications'
import Devices from './pages/Devices/Devices'
import DeviceWebUi from './pages/Devices/DeviceWebUi'
import Gateways from './pages/Gateways/Gateways'
import Routers from './pages/Routers/Routers'
import RouterManagement from './pages/Routers/RouterManagement'
import Hosts from './pages/Hosts/Hosts'
import HostManagement from './pages/Hosts/HostManagement'
import HostRemoteDisplay from './pages/Hosts/HostRemoteDisplay'
import Users from './pages/Users/Users'
import Vpn from './pages/Vpn/Vpn'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import DefinirSenha from './pages/Auth/DefinirSenha'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Carregando...</div>
    </div>
  )
}

function GuestOrRedirect() {
  const { isLoading, isAuthenticated, mustChangePassword } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (isAuthenticated) {
    if (mustChangePassword) return <Navigate to="/definir-senha" replace />
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

function RequirePasswordChange() {
  const { isLoading, isAuthenticated, mustChangePassword } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!mustChangePassword) return <Navigate to="/" replace />
  return <Outlet />
}

function RequireFullSession() {
  const { isLoading, isAuthenticated, mustChangePassword } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (mustChangePassword) return <Navigate to="/definir-senha" replace />
  return <Outlet />
}

function CatchAllRedirect() {
  const { isAuthenticated, mustChangePassword } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (mustChangePassword) return <Navigate to="/definir-senha" replace />
  return <Navigate to="/" replace />
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <GuestOrRedirect />,
    children: [{ index: true, element: <Login /> }],
  },
  {
    path: '/forgot-password',
    element: <GuestOrRedirect />,
    children: [{ index: true, element: <ForgotPassword /> }],
  },
  {
    path: '/register',
    element: <GuestOrRedirect />,
    children: [{ index: true, element: <Register /> }],
  },
  {
    path: '/definir-senha',
    element: <RequirePasswordChange />,
    children: [{ index: true, element: <DefinirSenha /> }],
  },
  {
    path: '/',
    element: <RequireFullSession />,
    children: [
      {
        path: 'remote-display/:hostId',
        element: <HostRemoteDisplay />,
      },
      {
        path: 'host-console/:hostId',
        element: <HostManagement />,
      },
      {
        path: 'devices/:deviceId/web-ui/*',
        element: <DeviceWebUi />,
      },
      {
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'applications', element: <Applications /> },
          { path: 'devices', element: <Devices /> },
          { path: 'gateways', element: <Gateways /> },
          { path: 'routers', element: <Routers /> },
          { path: 'routers/:routerId/management', element: <RouterManagement /> },
          { path: 'hosts', element: <Hosts /> },
          { path: 'hosts/:hostId/management', element: <Navigate to="/hosts" replace /> },
          { path: 'users', element: <Users /> },
          { path: 'vpn', element: <Vpn /> },
        ],
      },
    ],
  },
  { path: '*', element: <CatchAllRedirect /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App

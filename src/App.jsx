import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import Applications from './pages/Applications/Applications'
import Devices from './pages/Devices/Devices'
import Gateways from './pages/Gateways/Gateways'
import Routers from './pages/Routers/Routers'
import RouterManagement from './pages/Routers/RouterManagement'
import Hosts from './pages/Hosts/Hosts'
import HostManagement from './pages/Hosts/HostManagement'
import Users from './pages/Users/Users'
import Vpn from './pages/Vpn/Vpn'
import Login from './pages/Auth/Login'
import ForgotPassword from './pages/Auth/ForgotPassword'
import DefinirSenha from './pages/Auth/DefinirSenha'

function AppRoutes() {
  const { isAuthenticated, isLoading, mustChangePassword } = useAuth()

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    )
  }

  if (isAuthenticated && mustChangePassword) {
    return (
      <Routes>
        <Route path="/definir-senha" element={<DefinirSenha />} />
        <Route path="*" element={<Navigate to="/definir-senha" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
      />

      <Route
        path="/"
        element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Dashboard />} />
        <Route path="applications" element={<Applications />} />
        <Route path="devices" element={<Devices />} />
        <Route path="gateways" element={<Gateways />} />
        <Route path="routers" element={<Routers />} />
        <Route path="routers/:routerId/management" element={<RouterManagement />} />
        <Route path="hosts" element={<Hosts />} />
        <Route path="hosts/:hostId/management" element={<HostManagement />} />
        <Route path="users" element={<Users />} />
        <Route path="vpn" element={<Vpn />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App


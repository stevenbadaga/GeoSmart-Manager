import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Clients from './pages/Clients'
import Projects from './pages/Projects'
import Datasets from './pages/Datasets'
import Subdivision from './pages/Subdivision'
import Compliance from './pages/Compliance'
import Workflow from './pages/Workflow'
import Reports from './pages/Reports'
import Audit from './pages/Audit'
import Permissions from './pages/Permissions'
import Account from './pages/Account'
import NotFound from './pages/NotFound'
import MapView from './pages/Map'
import RwandaLayers from './pages/RwandaLayers'

function RequireAuth({ children }) {
  const { token, loading } = useAuth()
  if (loading) return <div className="p-10">Loading...</div>
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/rwanda-layers" element={<RwandaLayers />} />
        <Route path="/subdivision" element={<Subdivision />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/workflow" element={<Workflow />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/permissions" element={<Permissions />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Projects from './pages/Projects'
import Clients from './pages/Clients'
import Datasets from './pages/Datasets'
import Subdivision from './pages/Subdivision'
import Compliance from './pages/Compliance'
import Workflow from './pages/Workflow'
import Reports from './pages/Reports'
import Documents from './pages/Documents'
import DataLimitations from './pages/DataLimitations'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import MapView from './pages/Map'
import RwandaLayers from './pages/RwandaLayers'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import ContactMessages from './pages/ContactMessages'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import About from './pages/About'
import Features from './pages/Features'
import Contact from './pages/Contact'
import Audit from './pages/Audit'
import Permissions from './pages/Permissions'
import Account from './pages/Account'
import DataCompliance from './pages/DataCompliance'

function RequireAuth({ children }) {
  const { token, loading, isApproved } = useAuth()
  if (loading) return <div className="p-10">Loading...</div>
  if (!token) return <Navigate to="/login" />
  if (!isApproved) return <Navigate to="/login" />
  return children
}

function RequireRole({ children, allowed }) {
  const { user } = useAuth()
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/dashboard" />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/how-it-works" element={<Navigate to="/features#how-it-works" replace />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/data-compliance" element={<DataCompliance />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected dashboard routes */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<RequireRole allowed={['ADMIN']}><Users /></RequireRole>} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/subdivision" element={<RequireRole allowed={['ADMIN', 'SURVEYOR']}><Subdivision /></RequireRole>} />
        <Route path="/map" element={<MapView />} />
        <Route path="/rwanda-layers" element={<RwandaLayers />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/workflow" element={<Workflow />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/data-limitations" element={<DataLimitations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/audit" element={<RequireRole allowed={['ADMIN']}><Audit /></RequireRole>} />
        <Route path="/contact-messages" element={<RequireRole allowed={['ADMIN']}><ContactMessages /></RequireRole>} />
        <Route path="/permissions" element={<RequireRole allowed={['ADMIN']}><Permissions /></RequireRole>} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

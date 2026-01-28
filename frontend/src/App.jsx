import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { ProjectProvider } from './projects/ProjectContext'
import { RequireAuth } from './routes/RequireAuth'
import { RequireAdmin } from './routes/RequireAdmin'
import { RequireStaff } from './routes/RequireStaff'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/ToastProvider'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { DashboardPage } from './pages/Dashboard'
import { ClientsPage } from './pages/Clients'
import { ProjectsPage } from './pages/Projects'
import { WorkflowPage } from './pages/Workflow'
import { MapWorkspacePage } from './pages/MapWorkspace'
import { SubdivisionPage } from './pages/Subdivision'
import { CompliancePage } from './pages/Compliance'
import { ReportsPage } from './pages/Reports'
import { ProjectTeamPage } from './pages/ProjectTeam'
import { AccountPage } from './pages/Account'
import { ProjectDashboardPage } from './pages/ProjectDashboard'
import { FieldPage } from './pages/Field'
import { CollaborationPage } from './pages/Collaboration'
import { AdminUsersPage } from './pages/AdminUsers'
import { AdminAuditPage } from './pages/AdminAudit'
import { NotFoundPage } from './pages/NotFound'

const queryClient = new QueryClient()

function AuthedShell({ children }) {
  return <AppShell>{children}</AppShell>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <ProjectProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                <Route element={<RequireAuth />}>
                  <Route
                    path="/"
                    element={
                      <AuthedShell>
                        <DashboardPage />
                      </AuthedShell>
                    }
                  />
                  <Route
                    path="/projects"
                    element={
                      <AuthedShell>
                        <ProjectsPage />
                      </AuthedShell>
                    }
                  />
                  <Route
                    path="/project"
                    element={
                      <AuthedShell>
                        <ProjectDashboardPage />
                      </AuthedShell>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <AuthedShell>
                        <AccountPage />
                      </AuthedShell>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <AuthedShell>
                        <ReportsPage />
                      </AuthedShell>
                    }
                  />
                  <Route
                    path="/collaboration"
                    element={
                      <AuthedShell>
                        <CollaborationPage />
                      </AuthedShell>
                    }
                  />

                  <Route element={<RequireStaff />}>
                    <Route
                      path="/clients"
                      element={
                        <AuthedShell>
                          <ClientsPage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/workflow"
                      element={
                        <AuthedShell>
                          <WorkflowPage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/team"
                      element={
                        <AuthedShell>
                          <ProjectTeamPage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/field"
                      element={
                        <AuthedShell>
                          <FieldPage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/workspace"
                      element={
                        <AuthedShell>
                          <MapWorkspacePage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/subdivision"
                      element={
                        <AuthedShell>
                          <SubdivisionPage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/compliance"
                      element={
                        <AuthedShell>
                          <CompliancePage />
                        </AuthedShell>
                      }
                    />
                  </Route>

                  <Route element={<RequireAdmin />}>
                    <Route
                      path="/admin/users"
                      element={
                        <AuthedShell>
                          <AdminUsersPage />
                        </AuthedShell>
                      }
                    />
                    <Route
                      path="/admin/audit"
                      element={
                        <AuthedShell>
                          <AdminAuditPage />
                        </AuthedShell>
                      }
                    />
                  </Route>

                  <Route
                    path="*"
                    element={
                      <AuthedShell>
                        <NotFoundPage />
                      </AuthedShell>
                    }
                  />
                </Route>
              </Routes>
            </BrowserRouter>
          </ProjectProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

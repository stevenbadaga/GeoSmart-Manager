import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'
import {
  Activity,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Map,
  MapPin,
  MessagesSquare,
  PanelTop,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Users,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

function Item({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
          isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100',
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </NavLink>
  )
}

export function Sidebar({ onNavigate }) {
  const { user } = useAuth()
  const isClient = user?.role === 'CLIENT'

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">GeoSmart-Manager</div>
            <div className="text-xs text-slate-500">Geospatial ERP</div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1 px-3">
        <div onClick={onNavigate}>
          <Item to="/" icon={LayoutDashboard}>
            Dashboard
          </Item>
          {!isClient ? (
            <Item to="/clients" icon={Users}>
              Clients
            </Item>
          ) : null}
          <Item to="/projects" icon={FolderKanban}>
            {isClient ? 'My Projects' : 'Projects'}
          </Item>
          <Item to="/project" icon={PanelTop}>
            Project Dashboard
          </Item>
          <Item to="/collaboration" icon={MessagesSquare}>
            Collaboration
          </Item>
          {!isClient ? (
            <>
              <Item to="/team" icon={Users}>
                Team
              </Item>
              <Item to="/workflow" icon={ListTodo}>
                Workflow
              </Item>
              <Item to="/field" icon={MapPin}>
                Field Survey
              </Item>
              <Item to="/workspace" icon={Map}>
                Map Workspace
              </Item>
              <Item to="/subdivision" icon={SlidersHorizontal}>
                AI Subdivision
              </Item>
              <Item to="/compliance" icon={ShieldCheck}>
                Compliance
              </Item>
            </>
          ) : null}
          <Item to="/reports" icon={FileText}>
            Reports
          </Item>
          <Item to="/account" icon={UserCircle}>
            Account
          </Item>

          {user?.role === 'ADMIN' ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</div>
              <Item to="/admin/users" icon={Users}>
                Users
              </Item>
              <Item to="/admin/audit" icon={Activity}>
                Audit Log
              </Item>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="h-8 w-8 rounded-lg bg-slate-100" />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{user?.username || 'User'}</div>
            <div className="text-xs text-slate-500">{user?.role || ''}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

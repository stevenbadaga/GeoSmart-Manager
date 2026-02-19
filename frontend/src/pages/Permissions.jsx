import React from 'react'
import Card from '../components/Card'
import { useAuth } from '../auth/AuthContext'

const roles = [
  { key: 'ADMIN', label: 'Admin' },
  { key: 'PROJECT_MANAGER', label: 'Project Manager' },
  { key: 'SURVEYOR', label: 'Surveyor' },
  { key: 'ENGINEER', label: 'Engineer' },
  { key: 'CIVIL_ENGINEER', label: 'Civil Engineer' },
  { key: 'CLIENT', label: 'Client' }
]

const rows = [
  {
    module: 'Dashboard & Metrics',
    permissions: {
      ADMIN: 'View',
      PROJECT_MANAGER: 'View',
      SURVEYOR: 'View',
      ENGINEER: 'View',
      CIVIL_ENGINEER: 'View',
      CLIENT: 'View'
    }
  },
  {
    module: 'User Management',
    permissions: {
      ADMIN: 'Manage',
      PROJECT_MANAGER: 'No access',
      SURVEYOR: 'No access',
      ENGINEER: 'No access',
      CIVIL_ENGINEER: 'No access',
      CLIENT: 'No access'
    }
  },
  {
    module: 'Clients',
    permissions: {
      ADMIN: 'Manage',
      PROJECT_MANAGER: 'Manage',
      SURVEYOR: 'View',
      ENGINEER: 'View',
      CIVIL_ENGINEER: 'View',
      CLIENT: 'View'
    }
  },
  {
    module: 'Projects',
    permissions: {
      ADMIN: 'Manage',
      PROJECT_MANAGER: 'Manage',
      SURVEYOR: 'View',
      ENGINEER: 'View',
      CIVIL_ENGINEER: 'View',
      CLIENT: 'View'
    }
  },
  {
    module: 'Datasets',
    permissions: {
      ADMIN: 'Edit',
      PROJECT_MANAGER: 'Edit',
      SURVEYOR: 'Edit',
      ENGINEER: 'Edit',
      CIVIL_ENGINEER: 'Edit',
      CLIENT: 'No access'
    }
  },
  {
    module: 'AI Subdivision',
    permissions: {
      ADMIN: 'Run + View',
      PROJECT_MANAGER: 'Run + View',
      SURVEYOR: 'View',
      ENGINEER: 'Run + View',
      CIVIL_ENGINEER: 'Run + View',
      CLIENT: 'View'
    }
  },
  {
    module: 'Compliance',
    permissions: {
      ADMIN: 'Run + View',
      PROJECT_MANAGER: 'Run + View',
      SURVEYOR: 'View',
      ENGINEER: 'Run + View',
      CIVIL_ENGINEER: 'Run + View',
      CLIENT: 'View'
    }
  },
  {
    module: 'Reports',
    permissions: {
      ADMIN: 'Generate + View',
      PROJECT_MANAGER: 'Generate + View',
      SURVEYOR: 'View',
      ENGINEER: 'Generate + View',
      CIVIL_ENGINEER: 'Generate + View',
      CLIENT: 'View'
    }
  },
  {
    module: 'Workflow',
    permissions: {
      ADMIN: 'Edit',
      PROJECT_MANAGER: 'Edit',
      SURVEYOR: 'Edit',
      ENGINEER: 'Edit',
      CIVIL_ENGINEER: 'Edit',
      CLIENT: 'No access'
    }
  },
  {
    module: 'Audit Logs',
    permissions: {
      ADMIN: 'View',
      PROJECT_MANAGER: 'No access',
      SURVEYOR: 'No access',
      ENGINEER: 'No access',
      CIVIL_ENGINEER: 'No access',
      CLIENT: 'No access'
    }
  }
]

function permissionClass(value) {
  if (!value || value.toLowerCase().includes('no access')) return 'bg-danger/10 text-danger border-danger/20'
  if (value.toLowerCase().includes('manage') || value.toLowerCase().includes('generate') || value.toLowerCase().includes('run')) {
    return 'bg-river/10 text-river border-river/20'
  }
  if (value.toLowerCase().includes('edit')) return 'bg-warning/15 text-warning border-warning/20'
  return 'bg-success/10 text-success border-success/20'
}

export default function Permissions() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Security</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Role Permissions Matrix</h1>
        <p className="text-sm text-ink/60">This matrix reflects backend-enforced access rules for each module.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Current Role</p>
          <p className="text-lg font-semibold text-ink mt-2">{user?.role || 'Unknown'}</p>
          <p className="text-xs text-ink/60 mt-2">Logged-in account scope</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Roles Defined</p>
          <p className="text-2xl font-semibold text-ink mt-2">{roles.length}</p>
          <p className="text-xs text-ink/60 mt-2">System access profiles</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Protected Modules</p>
          <p className="text-2xl font-semibold text-ink mt-2">{rows.length}</p>
          <p className="text-xs text-ink/60 mt-2">RBAC-controlled endpoints</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-sand text-ink/70">
              <tr>
                <th className="text-left px-6 py-3 font-semibold min-w-[220px]">Module</th>
                {roles.map((role) => (
                  <th key={role.key} className="text-left px-4 py-3 font-semibold">{role.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.module} className="border-t border-clay/60">
                  <td className="px-6 py-4 font-semibold text-ink">{row.module}</td>
                  {roles.map((role) => {
                    const value = row.permissions[role.key]
                    return (
                      <td key={role.key} className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${permissionClass(value)}`}>
                          {value}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Notes">
        <div className="space-y-2 text-sm text-ink/70">
          <p>Permission checks are enforced on backend endpoints via role-based annotations.</p>
          <p>If UI allows an action but role is unauthorized, backend will reject with `403 Forbidden`.</p>
          <p>Use this page during demonstrations to explain access control decisions.</p>
        </div>
      </Card>
    </div>
  )
}

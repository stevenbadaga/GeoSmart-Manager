import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

const roleTabs = [
  { label: 'All Users', value: 'ALL', roles: [] },
  { label: 'Admins', value: 'ADMIN', roles: ['ADMIN'] },
  { label: 'Land Surveyors', value: 'SURVEYOR', roles: ['SURVEYOR'] },
  { label: 'Clients', value: 'CLIENT', roles: ['CLIENT'] }
]

const roleOptions = [
  { value: 'SURVEYOR', label: 'Land Surveyor' },
  { value: 'CLIENT', label: 'Client' }
]

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'SUSPENDED', label: 'Suspended' }
]

const avatarPalette = ['#063F35', '#0D2F27', '#4D694E', '#10201B', '#10B981', '#92400E']

const emptyForm = {
  fullName: '',
  email: '',
  role: 'SURVEYOR',
  status: 'ACTIVE',
  password: ''
}

function avatarColor(name = '') {
  const hash = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatarPalette[hash % avatarPalette.length]
}

function roleBadge(role) {
  switch (role) {
    case 'ADMIN':
      return 'badge-info'
    case 'SURVEYOR':
      return 'badge-success'
    case 'CLIENT':
      return 'badge-warning'
    default:
      return 'badge-slate'
  }
}

function formatRole(role) {
  const match = roleOptions.find((option) => option.value === role)
  return match ? match.label : role
}

function formatStatus(status) {
  const match = statusOptions.find((option) => option.value === status)
  return match ? match.label : status || 'Unknown'
}

function formatRelative(value) {
  if (!value) return 'Never'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return '--'
  const diffMs = Date.now() - time
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function normalizeEnum(value) {
  if (!value) return ''
  return value.trim().toUpperCase().replace(/\s+/g, '_')
}

function splitCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"') {
      current += '"'
      i += 1
      continue
    }
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }
  result.push(current)
  return result.map((value) => value.trim())
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })
}

export default function Users() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('ALL')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)
  const fileInputRef = useRef(null)
  const pageSize = 8

  const loadUsers = () => {
    setLoading(true)
    api.get('/api/users')
      .then((data) => setUsers(data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers()
    }
  }, [user?.role])

  useEffect(() => {
    const q = params.get('q') || ''
    setQuery(q)
  }, [params])

  if (user?.role !== 'ADMIN') {
    return (
      <Card title="Access Restricted">
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          User management is reserved for system administrators. Please contact your organization head for access.
        </p>
      </Card>
    )
  }

  const filteredUsers = useMemo(() => {
    const tab = roleTabs.find((item) => item.value === activeTab)
    return users.filter((u) => {
      const matchesQuery = [u.fullName, u.email].some((field) =>
        field?.toLowerCase().includes(query.toLowerCase())
      )
      const matchesRole = !tab?.roles?.length || tab.roles.includes(u.role)
      return matchesQuery && matchesRole
    })
  }, [users, activeTab, query])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const pageStart = (page - 1) * pageSize
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + pageSize)

  useEffect(() => {
    setPage(1)
  }, [activeTab, query, users.length])

  const openCreate = () => {
    setEditingUser(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
    setInfo('')
  }

  const openEdit = (u) => {
    setEditingUser(u)
    setForm({
      fullName: u.fullName || '',
      email: u.email || '',
      role: u.role || 'SURVEYOR',
      status: u.status || 'ACTIVE',
      password: ''
    })
    setShowForm(true)
    setError('')
    setInfo('')
  }

  const toggleMenu = (userId) => {
    setOpenMenuId((current) => (current === userId ? null : userId))
  }

  const updateStatus = async (targetUser, status) => {
    setError('')
    setInfo('')
    try {
      await api.put(`/api/users/${targetUser.id}`, { status })
      setInfo(`Account status for ${targetUser.fullName} updated to ${status}.`)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setOpenMenuId(null)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, {
          fullName: form.fullName,
          role: form.role,
          status: form.status
        })
        setInfo('User profile updated successfully.')
      } else {
        await api.post('/api/users', {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          status: form.status
        })
        setInfo('New user account created.')
      }
      closeForm()
      loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleBulkImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const onFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setInfo('')
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (!rows.length) {
        setError('CSV file is empty or invalid.')
        return
      }

      let success = 0
      for (const row of rows) {
        const payload = {
          fullName: row.fullName || row.name || '',
          email: row.email || '',
          password: row.password || '',
          role: normalizeEnum(row.role || 'SURVEYOR') === 'CLIENT' ? 'CLIENT' : 'SURVEYOR',
          status: normalizeEnum(row.status || 'ACTIVE'),
        }
        if (!payload.fullName || !payload.email || !payload.password) continue
        await api.post('/api/users', payload)
        success += 1
      }
      loadUsers()
      setInfo(`Successfully imported ${success} team members.`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-10 animate-rise">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <section className="flex-1 rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">Identity & Governance</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Team & Users</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">Manage identity, role-based access, and account health across the platform.</p>
        </section>
        <div className="flex flex-wrap gap-3 self-end lg:self-center">
          <Button variant="secondary" className="px-6 shadow-sm" onClick={handleBulkImport}>Bulk Import</Button>
          <Button className="px-8 shadow-xl" onClick={openCreate}>Add Team Member</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>

      <Card className="shadow-premium">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-100">
            {roleTabs.map((tab) => (
              <button
                key={tab.value}
                className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.value 
                    ? 'bg-white text-emerald-700 shadow-lg ring-1 ring-emerald-500/10' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full lg:w-[360px] group focus-within:bg-white focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="bg-transparent text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none w-full"
              placeholder="Filter by identity or email..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden shadow-premium border-slate-200/60">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left font-black uppercase tracking-widest text-[10px] text-slate-400">User Identity</th>
                <th className="text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Role</th>
                <th className="text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Credentials</th>
                <th className="text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Status</th>
                <th className="text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Last Activity</th>
                <th className="text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.map((u) => (
                <tr key={u.id} className="group hover:bg-slate-50/40 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-[13px] font-black uppercase shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3"
                        style={{ background: `linear-gradient(135deg, ${avatarColor(u.fullName)}, ${avatarColor(u.fullName)}dd)` }}
                      >
                        {u.fullName?.slice(0, 1) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors font-display">{u.fullName}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">ID #{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`status-badge ${roleBadge(u.role)}`}>
                      {formatRole(u.role)}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-600">{u.email}</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">Primary Auth</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="flex items-center gap-2.5 text-[13px] font-bold text-slate-700">
                      <span
                        className={`status-dot ${
                          u.status === 'ACTIVE' ? 'dot-success' : 
                          u.status === 'INVITED' ? 'dot-info' : 
                          u.status === 'SUSPENDED' ? 'dot-danger' : 'dot-slate'
                        }`}
                      />
                      {formatStatus(u.status)}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-bold text-slate-500 text-[13px]">{formatRelative(u.lastActiveAt)}</td>
                  <td className="px-8 py-6 text-right relative">
                    <button
                      className="h-8 w-8 inline-grid place-items-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-md transition-all active:scale-95"
                      onClick={() => toggleMenu(u.id)}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>
                    {openMenuId === u.id && (
                      <div className="absolute mt-2 right-8 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 text-[10px] font-black uppercase tracking-widest text-slate-500 z-30 min-w-[160px] animate-rise">
                        <button className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 hover:text-emerald-700 rounded-lg transition-all" onClick={() => openEdit(u)}>
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          Edit Profile
                        </button>
                        <div className="h-px bg-slate-50 my-1" />
                        <button className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-all" onClick={() => updateStatus(u, 'ACTIVE')}>Set Active</button>
                        <button className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-all" onClick={() => updateStatus(u, 'OFFLINE')}>Set Offline</button>
                        <button className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-all" onClick={() => updateStatus(u, 'SUSPENDED')}>Suspend</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!pagedUsers.length && (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="h-16 w-16 grid place-items-center rounded-full bg-slate-50 text-slate-300 mb-2 shadow-sm">
                          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 110-8 4 4 0 010 8z" /></svg>
                       </div>
                       <p className="text-base font-bold text-slate-400 uppercase tracking-widest">No users found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-8 py-5 border-t border-slate-100 bg-slate-50/20">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            Page {page} of {totalPages} • {filteredUsers.length} members
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-700 hover:border-emerald-200 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-700 hover:border-emerald-200 transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-6">
          <Card className="w-full max-w-lg p-0 relative shadow-2xl overflow-hidden border-none animate-rise">
            <div className="bg-[#063F35] p-10 text-white relative">
               <div className="absolute right-0 top-0 h-full w-1/4 bg-emerald-500/10 blur-xl" />
               <button className="absolute right-8 top-8 h-10 w-10 grid place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10" onClick={closeForm}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
               </button>
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Team Access</p>
               <h3 className="text-2xl font-bold tracking-tight font-display">{editingUser ? 'Edit User Profile' : 'New Team Member'}</h3>
            </div>
            
            <form className="p-10 space-y-8 bg-white" onSubmit={handleSubmit}>
              <div className="space-y-6">
                <Input label="Full Name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required placeholder="e.g. Jean Pierre" />
                <Input label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={Boolean(editingUser)} placeholder="name@organization.rw" />
                {!editingUser && (
                  <Input label="Temporary password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required placeholder="••••••••" />
                )}
                <div className="grid grid-cols-2 gap-6">
                  {editingUser?.role === 'ADMIN' ? (
                    <div className="space-y-2">
                      <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">Platform Role</span>
                      <div className="input flex items-center bg-slate-50 text-slate-400 font-bold border-slate-100 h-[48px]">Administrator</div>
                    </div>
                  ) : (
                    <label className="block space-y-2">
                      <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">Platform Role</span>
                      <select className="input h-[48px]" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block space-y-2">
                    <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">Account Status</span>
                    <select className="input h-[48px]" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                <button type="button" className="px-8 py-3 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors" onClick={closeForm}>Cancel</button>
                <Button className="px-10 py-4 shadow-xl" type="submit">{editingUser ? 'Save Changes' : 'Invite User'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

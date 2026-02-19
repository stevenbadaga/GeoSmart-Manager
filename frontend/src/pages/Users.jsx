import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

const roleTabs = [
  { label: 'All Users', value: 'ALL', roles: [] },
  { label: 'Surveyors', value: 'SURVEYOR', roles: ['SURVEYOR'] },
  { label: 'Engineers', value: 'ENGINEER', roles: ['ENGINEER', 'CIVIL_ENGINEER'] },
  { label: 'Managers', value: 'MANAGER', roles: ['PROJECT_MANAGER', 'ADMIN'] },
  { label: 'Clients', value: 'CLIENT', roles: ['CLIENT'] }
]

const roleOptions = [
  { value: 'ADMIN', label: 'System Admin' },
  { value: 'SURVEYOR', label: 'Surveyor' },
  { value: 'ENGINEER', label: 'Engineer' },
  { value: 'CIVIL_ENGINEER', label: 'Civil Engineer' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'CLIENT', label: 'Client' }
]

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INVITED', label: 'Invited' },
  { value: 'OFFLINE', label: 'Offline' },
  { value: 'SUSPENDED', label: 'Suspended' }
]

const avatarPalette = ['#1F6F5F', '#2A6FA1', '#B6862C', '#5B667A', '#1F8A4C', '#C97A1A']

const emptyForm = {
  fullName: '',
  email: '',
  role: 'SURVEYOR',
  status: 'ACTIVE',
  professionalLicense: '',
  password: ''
}

function avatarColor(name = '') {
  const hash = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatarPalette[hash % avatarPalette.length]
}

function roleBadge(role) {
  switch (role) {
    case 'ADMIN':
      return 'bg-water/10 text-water'
    case 'PROJECT_MANAGER':
      return 'bg-parcel/15 text-parcel'
    case 'CIVIL_ENGINEER':
      return 'bg-moss/10 text-moss'
    case 'SURVEYOR':
      return 'bg-success/10 text-success'
    case 'CLIENT':
      return 'bg-sand text-secondary'
    default:
      return 'bg-river/10 text-river'
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
  if (!value) return '--'
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return '--'
  const diffMs = Date.now() - time
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} mins ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return `${days} days ago`
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
  const pageSize = 6

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
        <p className="text-sm text-ink/70">
          User management is available to system administrators only.
        </p>
      </Card>
    )
  }

  const filteredUsers = useMemo(() => {
    const tab = roleTabs.find((item) => item.value === activeTab)
    return users.filter((user) => {
      const matchesQuery = [user.fullName, user.email].some((field) =>
        field?.toLowerCase().includes(query.toLowerCase())
      )
      const matchesRole = !tab?.roles?.length || tab.roles.includes(user.role)
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

  const openEdit = (user) => {
    setEditingUser(user)
    setForm({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'SURVEYOR',
      status: user.status || 'ACTIVE',
      professionalLicense: user.professionalLicense || '',
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
      setInfo(`Status updated to ${status}.`)
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
          status: form.status,
          professionalLicense: form.professionalLicense
        })
        setInfo('User updated successfully.')
      } else {
        await api.post('/api/users', {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          role: form.role,
          status: form.status,
          professionalLicense: form.professionalLicense
        })
        setInfo('User created successfully.')
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
          role: normalizeEnum(row.role || 'SURVEYOR'),
          status: normalizeEnum(row.status || 'ACTIVE'),
          professionalLicense: row.professionalLicense || row.license || ''
        }
        if (!payload.fullName || !payload.email || !payload.password) {
          continue
        }
        await api.post('/api/users', payload)
        success += 1
      }
      loadUsers()
      setInfo(`Imported ${success} users successfully.`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Team & Users</h1>
          <p className="text-sm text-ink/60">Manage user access, roles, and professional credentials.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleBulkImport}>Bulk Import</Button>
          <Button onClick={openCreate}>Add New User</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
      <p className="text-xs text-ink/50">
        Bulk import CSV headers: fullName,email,password,role,status,professionalLicense
      </p>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {roleTabs.map((tab) => (
              <button
                key={tab.value}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === tab.value ? 'bg-river text-white' : 'bg-sand text-ink/70'
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white/90 border border-clay/70 rounded-xl px-3 py-2 w-full lg:w-72">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink/50" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              className="bg-transparent text-sm text-ink/70 placeholder:text-ink/40 focus:outline-none w-full"
              placeholder="Filter by name or email..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}
      {info && <p className="text-sm text-success">{info}</p>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-sand text-ink/60">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">User Profile</th>
                <th className="text-left px-6 py-3 font-semibold">Role</th>
                <th className="text-left px-6 py-3 font-semibold">Professional Lic</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Last Active</th>
                <th className="text-left px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => (
                <tr key={user.id} className="border-t border-clay/60">
                  <td className="px-6 py-4 relative">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full border border-clay/70 flex items-center justify-center text-white text-sm font-semibold"
                        style={{ background: avatarColor(user.fullName) }}
                      >
                        {user.fullName?.slice(0, 1) || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{user.fullName}</p>
                        <p className="text-xs text-ink/50">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${roleBadge(user.role)}`}>
                      {formatRole(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ink/70">{user.professionalLicense || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-xs text-ink/70">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-success'
                            : user.status === 'INVITED'
                              ? 'bg-water'
                              : user.status === 'SUSPENDED'
                                ? 'bg-danger'
                                : 'bg-secondary'
                        }`}
                      />
                      {formatStatus(user.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-ink/70">{formatRelative(user.lastActiveAt)}</td>
                  <td className="px-6 py-4">
                    <button
                      className="text-ink/60 hover:text-ink transition"
                      onClick={() => toggleMenu(user.id)}
                      title="Actions"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                    {openMenuId === user.id && (
                      <div className="absolute mt-2 right-6 bg-white border border-clay/70 rounded-xl shadow-lg p-2 text-xs text-ink/70 z-10">
                        <button className="block w-full text-left px-3 py-2 hover:bg-sand rounded-lg" onClick={() => openEdit(user)}>Edit Profile</button>
                        <button className="block w-full text-left px-3 py-2 hover:bg-sand rounded-lg" onClick={() => updateStatus(user, 'ACTIVE')}>Set Active</button>
                        <button className="block w-full text-left px-3 py-2 hover:bg-sand rounded-lg" onClick={() => updateStatus(user, 'OFFLINE')}>Set Offline</button>
                        <button className="block w-full text-left px-3 py-2 hover:bg-sand rounded-lg" onClick={() => updateStatus(user, 'INVITED')}>Mark Invited</button>
                        <button className="block w-full text-left px-3 py-2 hover:bg-sand rounded-lg text-danger" onClick={() => updateStatus(user, 'SUSPENDED')}>Suspend</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!pagedUsers.length && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-ink/50">
                    {loading ? 'Loading users...' : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-clay/60 text-xs text-ink/50">
          <span>
            Showing {filteredUsers.length ? pageStart + 1 : 0} to {Math.min(pageStart + pageSize, filteredUsers.length)} of {filteredUsers.length} users
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded-lg border border-clay/70 bg-white text-ink/70 disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="px-2 py-1 rounded-lg bg-sand text-ink/70">Page {page} of {totalPages}</span>
            <button
              className="px-2 py-1 rounded-lg border border-clay/70 bg-white text-ink/70 disabled:opacity-40"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-clay/70 w-full max-w-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button className="text-ink/50 hover:text-ink" onClick={closeForm}>x</button>
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <Input label="Full name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
              <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required disabled={Boolean(editingUser)} />
              {!editingUser && (
                <Input label="Temporary password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              )}
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Role</span>
                <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Status</span>
                <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <Input label="Professional license" value={form.professionalLicense} onChange={(event) => setForm({ ...form, professionalLicense: event.target.value })} />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={closeForm}>Cancel</Button>
                <Button type="submit">{editingUser ? 'Save Changes' : 'Create User'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

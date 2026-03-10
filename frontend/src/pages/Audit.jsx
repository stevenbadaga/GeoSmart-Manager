import React, { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'

function formatActionTone(action) {
  const normalized = (action || '').toUpperCase()
  if (normalized.includes('DELETE') || normalized.includes('SUSPEND')) return 'text-danger bg-danger/10 border-danger/25'
  if (normalized.includes('LOGIN') || normalized.includes('REGISTER')) return 'text-water bg-water/10 border-water/20'
  if (normalized.includes('CREATE') || normalized.includes('RUN') || normalized.includes('GENERATE')) return 'text-river bg-river/10 border-river/20'
  return 'text-ink/75 bg-sand border-clay/70'
}

function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

export default function Audit() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [integrity, setIntegrity] = useState(null)
  const [integrityError, setIntegrityError] = useState('')
  const [query, setQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  const isAdmin = user?.role === 'ADMIN'

  const loadLogs = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')
    try {
      const data = await api.get('/api/audit')
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.status === 403) {
        setError('Your account cannot view audit logs. Ask an administrator to grant access.')
      } else {
        setError(err.message || 'Unable to load audit logs.')
      }
      setLogs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const verifyIntegrity = async () => {
    setIntegrityError('')
    if (!isAdmin) {
      setIntegrityError('Only administrators can run integrity verification.')
      return
    }
    try {
      const result = await api.get('/api/audit/verify')
      setIntegrity(result)
    } catch (err) {
      setIntegrityError(err.message)
    }
  }

  const filteredLogs = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase()
    return logs.filter((log) => {
      const matchesAction = actionFilter === 'ALL' || (log.action || '').toUpperCase() === actionFilter
      if (!matchesAction) return false
      if (!lowerQuery) return true
      const haystack = [
        log.actorEmail,
        log.action,
        log.entityType,
        log.details,
        String(log.entityId || '')
      ].join(' ').toLowerCase()
      return haystack.includes(lowerQuery)
    })
  }, [logs, query, actionFilter])

  const actionOptions = useMemo(() => {
    const unique = new Set(logs.map((log) => (log.action || '').toUpperCase()).filter(Boolean))
    return ['ALL', ...Array.from(unique)]
  }, [logs])

  const totalLogs = logs.length
  const uniqueActors = new Set(logs.map((log) => log.actorEmail)).size
  const lastEventAt = logs[0]?.createdAt

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Audit & Security</p>
          <h1 className="text-2xl font-semibold text-ink mt-2">Audit Trail</h1>
          <p className="text-sm text-ink/60">Track critical actions across projects, users, and datasets.</p>
        </div>
        <Button
          variant="secondary"
          className="w-full md:w-auto"
          onClick={() => loadLogs({ silent: true })}
          disabled={refreshing || loading}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Logs'}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="block space-y-2">
          <span className="text-xs font-semibold tracking-[0.12em] text-ink/50">SEARCH</span>
          <input
            className="input"
            placeholder="Search by actor, action, entity, or details..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-semibold tracking-[0.12em] text-ink/50">ACTION</span>
          <select className="input" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
            {actionOptions.map((option) => (
              <option key={option} value={option}>{option === 'ALL' ? 'All actions' : option}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Events</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalLogs}</p>
          <p className="text-xs text-ink/60 mt-2">Logged system actions</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Unique Actors</p>
          <p className="text-2xl font-semibold text-ink mt-2">{uniqueActors}</p>
          <p className="text-xs text-ink/60 mt-2">Users who triggered events</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Latest Event</p>
          <p className="text-sm font-semibold text-ink mt-2">{formatDateTime(lastEventAt)}</p>
          <p className="text-xs text-ink/60 mt-2">Most recent recorded action</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card title="Audit Logs">
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          {loading && !error && <p className="text-sm text-ink/65 mb-3">Loading audit logs...</p>}
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${formatActionTone(log.action)}`}>
                      {log.action}
                    </span>
                    <p className="text-sm font-medium text-ink/80">{log.entityType} #{log.entityId || '-'}</p>
                  </div>
                  <span className="text-xs text-ink/55 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                </div>
                <p className="text-sm text-ink/75 mt-2">{log.details || 'No additional details recorded.'}</p>
                <p className="text-xs text-ink/55 mt-2">Actor: {log.actorEmail}</p>
              </div>
            ))}
            {!loading && filteredLogs.length === 0 && !error && (
              <p className="text-sm text-ink/70">No audit logs match the current filter.</p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Integrity Check">
            <Button variant="secondary" className="w-full" onClick={verifyIntegrity} disabled={!isAdmin}>
              Verify audit integrity
            </Button>
            {!isAdmin && (
              <p className="text-xs text-ink/60 mt-2">Only admins can run chain verification.</p>
            )}
            {integrity && (
              <p className="text-xs text-ink/70 mt-2">
                {integrity.valid ? 'Audit chain is valid.' : `Audit chain broken at IDs: ${integrity.brokenIds.join(', ')}`}
              </p>
            )}
            {integrityError && <p className="text-xs text-danger mt-2">{integrityError}</p>}
          </Card>
          <Card title="Security Notes">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Audit logs are tamper-evident and captured on create, update, and delete workflows.</p>
              <p>Run integrity checks after imports, bulk changes, or system updates.</p>
              <p>Use filters to quickly trace actor behavior, timeline events, or entity history.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

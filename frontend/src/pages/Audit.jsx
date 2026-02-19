import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import { api } from '../api/http'

export default function Audit() {
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [integrity, setIntegrity] = useState(null)
  const [integrityError, setIntegrityError] = useState('')

  const totalLogs = logs.length
  const uniqueActors = new Set(logs.map((log) => log.actorEmail)).size

  useEffect(() => {
    api.get('/api/audit')
      .then(setLogs)
      .catch((err) => setError(err.message))
  }, [])

  const verifyIntegrity = async () => {
    setIntegrityError('')
    try {
      const result = await api.get('/api/audit/verify')
      setIntegrity(result)
    } catch (err) {
      setIntegrityError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Audit & Security</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Audit Trail</h1>
        <p className="text-sm text-ink/60">Track critical actions across projects, users, and datasets.</p>
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
          <p className="text-xs text-ink/50">Integrity Status</p>
          <p className="text-lg font-semibold text-ink mt-2">{integrity?.valid ? 'Verified' : 'Not verified'}</p>
          <p className="text-xs text-ink/60 mt-2">Run validation for audit chain</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card title="Audit Logs">
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{log.action}</h4>
                  <span className="text-xs text-ink/60">{log.createdAt}</span>
                </div>
                <p className="text-sm text-ink/70">{log.entityType} #{log.entityId || '-'}</p>
                <p className="text-sm text-ink/70">{log.details}</p>
                <p className="text-xs text-ink/50">Actor: {log.actorEmail}</p>
              </div>
            ))}
            {logs.length === 0 && !error && <p className="text-sm text-ink/70">No audit logs yet.</p>}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Integrity Check">
            <Button variant="secondary" className="w-full" onClick={verifyIntegrity}>Verify audit integrity</Button>
            {integrity && (
              <p className="text-xs text-ink/70 mt-2">
                {integrity.valid ? 'Audit chain is valid.' : `Audit chain broken at IDs: ${integrity.brokenIds.join(', ')}`}
              </p>
            )}
            {integrityError && <p className="text-xs text-danger mt-2">{integrityError}</p>}
          </Card>
          <Card title="Security Notes">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Audit logs are tamper-evident and captured on every create, update, and delete.</p>
              <p>Run integrity checks after imports, bulk changes, or system updates.</p>
              <p>Export logs for periodic compliance and internal review.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

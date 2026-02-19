import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

export default function Clients() {
  const [params] = useSearchParams()
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ name: '', contactEmail: '', phone: '', address: '' })
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const loadClients = () => {
    api.get('/api/clients')
      .then(setClients)
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    const q = params.get('q') || ''
    setSearch(q)
  }, [params])

  const filtered = useMemo(() => {
    if (!search) return clients
    const lower = search.toLowerCase()
    return clients.filter((client) =>
      [client.name, client.contactEmail, client.phone, client.address]
        .some((value) => value?.toLowerCase().includes(lower))
    )
  }, [clients, search])

  const totalClients = clients.length
  const reachableClients = clients.filter((client) => client.contactEmail || client.phone).length
  const kigaliClients = clients.filter((client) => client.address?.toLowerCase().includes('kigali')).length
  const reachPercent = totalClients ? Math.round((reachableClients / totalClients) * 100) : 0

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/api/clients', form)
      setForm({ name: '', contactEmail: '', phone: '', address: '' })
      loadClients()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Client Management</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Clients & Stakeholders</h1>
        <p className="text-sm text-ink/60">Maintain accurate client records for surveys, subdivisions, and approvals.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Clients</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalClients}</p>
          <p className="text-xs text-success mt-2">Active client registry</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Reachable Contacts</p>
          <p className="text-2xl font-semibold text-ink mt-2">{reachPercent}%</p>
          <p className="text-xs text-ink/60 mt-2">{reachableClients} clients with email or phone</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Kigali Based</p>
          <p className="text-2xl font-semibold text-ink mt-2">{kigaliClients}</p>
          <p className="text-xs text-ink/60 mt-2">Address indicates Kigali City</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Client Directory</h3>
              <p className="text-sm text-ink/60">Search by name, email, phone, or address.</p>
            </div>
            <div className="w-full md:w-72">
              <Input label="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {filtered.map((client) => (
              <div key={client.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-sand border border-clay/70 flex items-center justify-center text-ink/60 font-semibold">
                      {client.name?.slice(0, 1) || 'C'}
                    </div>
                    <div>
                      <p className="font-semibold text-ink">{client.name}</p>
                      <p className="text-sm text-ink/60">{client.address || 'Address not provided'}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/60">
                        <span className="px-2 py-1 rounded-full bg-sand border border-clay/70">
                          {client.contactEmail || 'No email'}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-sand border border-clay/70">
                          {client.phone || 'No phone'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-ink/40">ID #{client.id}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-ink/70">No clients found.</p>}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Add Client">
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input label="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full">Save client</Button>
            </form>
          </Card>
          <Card title="Best Practices">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Capture client email and phone for faster approvals and payment follow-ups.</p>
              <p>Include location details (district, sector) to help allocate survey crews.</p>
              <p>Use a consistent naming format to simplify contracts and report exports.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

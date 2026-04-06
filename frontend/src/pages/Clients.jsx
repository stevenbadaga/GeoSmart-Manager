import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const kycStatusOptions = ['PENDING', 'VERIFIED', 'REJECTED']

const emptyForm = {
  name: '',
  contactEmail: '',
  phone: '',
  address: '',
  idDocumentReference: '',
  landOwnershipReference: '',
  kycStatus: 'PENDING',
  reviewerNotes: ''
}

function statusPill(status) {
  if (status === 'VERIFIED') return 'bg-success/10 text-success'
  if (status === 'REJECTED') return 'bg-danger/10 text-danger'
  return 'bg-warning/15 text-warning'
}

export default function Clients() {
  const [params] = useSearchParams()
  const [clients, setClients] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [search, setSearch] = useState('')

  const loadClients = () => {
    api.get('/api/clients')
      .then((data) => setClients(data || []))
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
      [
        client.name,
        client.contactEmail,
        client.phone,
        client.address,
        client.idDocumentReference,
        client.landOwnershipReference,
        client.reviewerNotes
      ].some((value) => value?.toLowerCase().includes(lower))
    )
  }, [clients, search])

  const totalClients = clients.length
  const reachableClients = clients.filter((client) => client.contactEmail || client.phone).length
  const verifiedClients = clients.filter((client) => client.kycStatus === 'VERIFIED').length
  const pendingClients = clients.filter((client) => client.kycStatus === 'PENDING').length
  const reachPercent = totalClients ? Math.round((reachableClients / totalClients) * 100) : 0

  const openEdit = (client) => {
    setEditing(client)
    setForm({
      name: client.name || '',
      contactEmail: client.contactEmail || '',
      phone: client.phone || '',
      address: client.address || '',
      idDocumentReference: client.idDocumentReference || '',
      landOwnershipReference: client.landOwnershipReference || '',
      kycStatus: client.kycStatus || 'PENDING',
      reviewerNotes: client.reviewerNotes || ''
    })
    setError('')
    setInfo('')
  }

  const resetForm = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    try {
      if (editing) {
        await api.put(`/api/clients/${editing.id}`, form)
        setInfo('Client updated successfully.')
      } else {
        await api.post('/api/clients', form)
        setInfo('Client saved successfully.')
      }
      resetForm()
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
        <p className="text-sm text-ink/60">Maintain KYC, ownership records, and approval readiness for every client.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Clients</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalClients}</p>
          <p className="text-xs text-success mt-2">Registry coverage</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Reachable Contacts</p>
          <p className="text-2xl font-semibold text-ink mt-2">{reachPercent}%</p>
          <p className="text-xs text-ink/60 mt-2">{reachableClients} clients with email or phone</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">KYC Verified</p>
          <p className="text-2xl font-semibold text-ink mt-2">{verifiedClients}</p>
          <p className="text-xs text-success mt-2">Approved for onboarding</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Pending Review</p>
          <p className="text-2xl font-semibold text-ink mt-2">{pendingClients}</p>
          <p className="text-xs text-warning mt-2">Need documentation review</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Client Directory</h3>
              <p className="text-sm text-ink/60">Search client identity, KYC references, or ownership records.</p>
            </div>
            <div className="w-full md:w-72">
              <Input label="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          {info && <p className="text-sm text-success mb-3">{info}</p>}
          <div className="space-y-3">
            {filtered.map((client) => (
              <div key={client.id} className="border border-clay/60 rounded-xl p-4 bg-white/70">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-sand border border-clay/70 flex items-center justify-center text-ink/60 font-semibold">
                      {client.name?.slice(0, 1) || 'C'}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-ink">{client.name}</p>
                        <p className="text-sm text-ink/60">{client.address || 'Address not provided'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-ink/60">
                        <span className="px-2 py-1 rounded-full bg-sand border border-clay/70">
                          {client.contactEmail || 'No email'}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-sand border border-clay/70">
                          {client.phone || 'No phone'}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${statusPill(client.kycStatus)}`}>
                          {client.kycStatus || 'PENDING'}
                        </span>
                      </div>
                      <div className="grid gap-1 text-xs text-ink/55">
                        <p>ID Reference: {client.idDocumentReference || 'Not provided'}</p>
                        <p>Ownership Ref: {client.landOwnershipReference || 'Not provided'}</p>
                        {client.reviewerNotes && <p>Reviewer Notes: {client.reviewerNotes}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-ink/40">ID #{client.id}</span>
                    <Button variant="secondary" onClick={() => openEdit(client)}>Edit</Button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-ink/70">No clients found.</p>}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title={editing ? 'Update Client' : 'Add Client'}>
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input label="Client name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input label="ID document reference" value={form.idDocumentReference} onChange={(e) => setForm({ ...form, idDocumentReference: e.target.value })} />
              <Input label="Land ownership reference" value={form.landOwnershipReference} onChange={(e) => setForm({ ...form, landOwnershipReference: e.target.value })} />
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">KYC status</span>
                <select className="input" value={form.kycStatus} onChange={(e) => setForm({ ...form, kycStatus: e.target.value })}>
                  {kycStatusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-ink/80">Reviewer notes</span>
                <textarea
                  className="input min-h-28"
                  value={form.reviewerNotes}
                  onChange={(e) => setForm({ ...form, reviewerNotes: e.target.value })}
                  placeholder="Capture validation remarks, missing items, or approval notes"
                />
              </label>
              <div className="flex gap-2">
                {editing && <Button className="w-full" variant="secondary" type="button" onClick={resetForm}>Cancel Edit</Button>}
                <Button className="w-full">{editing ? 'Update Client' : 'Save Client'}</Button>
              </div>
            </form>
          </Card>
          <Card title="Best Practices">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Record national ID or registration references before project kickoff.</p>
              <p>Capture land ownership references early to reduce approval delays later in the workflow.</p>
              <p>Use reviewer notes to track missing KYC items and client follow-up actions.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

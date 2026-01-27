import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
import { useAuth } from '../auth/AuthContext'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  kycIdType: z.string().optional(),
  kycIdNumber: z.string().optional(),
  kycNotes: z.string().optional(),
  landOwnershipDetails: z.string().optional(),
})

export function ClientsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState('')
  const [query, setQuery] = useState('')

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER'
  const tableCols = canManage ? 6 : 5

  const q = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/api/clients')).data,
  })

  const rows = useMemo(() => q.data ?? [], [q.data])

  const filteredRows = useMemo(() => {
    const v = query.trim().toLowerCase()
    if (!v) return rows
    return rows.filter((c) => {
      return (
        (c.name || '').toLowerCase().includes(v) ||
        (c.email || '').toLowerCase().includes(v) ||
        (c.phone || '').toLowerCase().includes(v)
      )
    })
  }, [rows, query])

  const defaultValues = useMemo(
    () =>
      editing
        ? {
            name: editing.name || '',
            email: editing.email || '',
            phone: editing.phone || '',
            address: editing.address || '',
            kycIdType: editing.kycIdType || '',
            kycIdNumber: editing.kycIdNumber || '',
            kycNotes: editing.kycNotes || '',
            landOwnershipDetails: editing.landOwnershipDetails || '',
          }
        : { name: '', email: '', phone: '', address: '', kycIdType: '', kycIdNumber: '', kycNotes: '', landOwnershipDetails: '' },
    [editing],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    values: defaultValues,
  })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (editing?.id) {
        return (await api.put(`/api/clients/${editing.id}`, values)).data
      }
      return (await api.post('/api/clients', values)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] })
      setOpen(false)
      toast.success('Saved', editing ? 'Client updated successfully.' : 'Client created successfully.')
      setEditing(null)
      reset({ name: '', email: '', phone: '', address: '', kycIdType: '', kycIdNumber: '', kycNotes: '', landOwnershipDetails: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/clients/${id}`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Deleted', 'Client deleted successfully.')
    },
  })

  function openCreate() {
    if (!canManage) return
    setEditing(null)
    setOpen(true)
    reset({ name: '', email: '', phone: '', address: '', kycIdType: '', kycIdNumber: '', kycNotes: '', landOwnershipDetails: '' })
  }

  function openEdit(row) {
    if (!canManage) return
    setEditing(row)
    setOpen(true)
    reset({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      kycIdType: row.kycIdType || '',
      kycIdNumber: row.kycIdNumber || '',
      kycNotes: row.kycNotes || '',
      landOwnershipDetails: row.landOwnershipDetails || '',
    })
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-600">Manage client onboarding and contact details.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            className="sm:w-72"
            placeholder="Search clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {canManage ? <Button onClick={openCreate}>Add client</Button> : null}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Portal</th>
                <th className="px-4 py-3">KYC</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                {canManage ? <th className="px-4 py-3">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {q.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={tableCols}>
                    Loading...
                  </td>
                </tr>
              ) : null}
              {q.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={tableCols}>
                    Failed to load clients.
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={tableCols}>
                    No clients yet.
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && rows.length > 0 && filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={tableCols}>
                    No clients found.
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((c) => (
                <tr key={c.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3">
                    {c.userId ? <Badge tone="green">Linked</Badge> : <Badge tone="amber">Not linked</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {c.kycIdType || c.kycIdNumber ? (
                      <span>
                        {(c.kycIdType || '').trim() || 'ID'}: {(c.kycIdNumber || '').trim() || '?'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{c.phone || '-'}</td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteId(c.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        title={editing ? 'Edit client' : 'Add client'}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <Input {...register('name')} />
            {errors.name ? <div className="mt-1 text-xs text-rose-600">{errors.name.message}</div> : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input {...register('email')} />
              {errors.email ? <div className="mt-1 text-xs text-rose-600">{errors.email.message}</div> : null}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input {...register('phone')} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Address</label>
            <Input {...register('address')} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">KYC ID type</label>
              <Input placeholder="E.g. National ID, Passport" {...register('kycIdType')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">KYC ID number</label>
              <Input {...register('kycIdNumber')} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">KYC notes</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              {...register('kycNotes')}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Land ownership details</label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              {...register('landOwnershipDetails')}
            />
          </div>

          {saveMutation.isError ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Save failed.</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setOpen(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete client?"
        message="This will permanently delete the client. Projects linked to this client may fail to load."
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        danger
        onClose={() => setConfirmDeleteId('')}
        onConfirm={() => {
          deleteMutation.mutate(confirmDeleteId, {
            onSettled: () => setConfirmDeleteId(''),
            onError: () => toast.error('Delete failed', 'Unable to delete client.'),
          })
        }}
      />
    </div>
  )
}

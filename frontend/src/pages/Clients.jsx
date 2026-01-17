import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export function ClientsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const q = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/api/clients')).data,
  })

  const rows = q.data || []

  const defaultValues = useMemo(
    () =>
      editing
        ? {
            name: editing.name || '',
            email: editing.email || '',
            phone: editing.phone || '',
            address: editing.address || '',
          }
        : { name: '', email: '', phone: '', address: '' },
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
      setEditing(null)
      reset({ name: '', email: '', phone: '', address: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/api/clients/${id}`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })

  function openCreate() {
    setEditing(null)
    setOpen(true)
    reset({ name: '', email: '', phone: '', address: '' })
  }

  function openEdit(row) {
    setEditing(row)
    setOpen(true)
    reset({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
    })
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-600">Manage client onboarding and contact details.</p>
        </div>
        <Button onClick={openCreate}>Add client</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {q.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {q.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={4}>
                    Failed to load clients.
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={4}>
                    No clients yet. Click “Add client” to create one.
                  </td>
                </tr>
              ) : null}
              {rows.map((c) => (
                <tr key={c.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-700">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteMutation.mutate(c.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
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
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


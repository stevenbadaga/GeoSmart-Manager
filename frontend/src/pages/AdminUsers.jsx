import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'ENGINEER', 'SURVEYOR', 'CLIENT']),
})

function tone(role) {
  return role === 'ADMIN' ? 'blue' : 'slate'
}

export function AdminUsersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/api/users')).data,
  })

  const users = usersQuery.data || []

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', role: 'ENGINEER' },
  })

  const createMutation = useMutation({
    mutationFn: async (values) => (await api.post('/api/users', values)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      form.reset()
      setOpen(false)
      toast.success('User created', 'New user created successfully.')
    },
    onError: (e) => toast.error('Create failed', e?.response?.data?.message || 'Unable to create user.'),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, enabled }) => (await api.patch(`/api/users/${id}/status`, { enabled })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Updated', 'User status updated.')
    },
    onError: (e) => toast.error('Update failed', e?.response?.data?.message || 'Unable to update user.'),
  })

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-600">Admin management for engineers and administrators.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Create user</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usersQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {usersQuery.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={5}>
                    Failed to load users.
                  </td>
                </tr>
              ) : null}
              {users.map((u) => (
                <tr key={u.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                  <td className="px-4 py-3 text-slate-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tone(u.role)}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.enabled ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ id: u.id, enabled: !u.enabled })}
                    >
                      {u.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={open} title="Create user" onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Username</label>
              <Input {...form.register('username')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input {...form.register('email')} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Password</label>
              <Input type="password" {...form.register('password')} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                {...form.register('role')}
              >
                <option value="ENGINEER">ENGINEER</option>
                <option value="SURVEYOR">SURVEYOR</option>
                <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                <option value="CLIENT">CLIENT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          {createMutation.isError ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createMutation.error?.response?.data?.message || 'Create failed.'}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

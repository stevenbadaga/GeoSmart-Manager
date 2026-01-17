import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED']).default('TODO'),
  assignedToUserId: z.string().optional(),
  dueDate: z.string().optional(),
})

function tone(status) {
  if (status === 'DONE') return 'green'
  if (status === 'IN_PROGRESS') return 'amber'
  if (status === 'BLOCKED') return 'red'
  return 'slate'
}

function toIsoOrNull(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function isoToDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function WorkflowPage() {
  const qc = useQueryClient()
  const { projectId } = useProject()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const usersQuery = useQuery({
    queryKey: ['assignable-users'],
    queryFn: async () => (await api.get('/api/users/assignable')).data,
  })
  const users = usersQuery.data || []

  const tasksQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['tasks', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/tasks`)).data,
  })

  const tasks = tasksQuery.data || []

  const defaultValues = useMemo(
    () =>
      editing
        ? {
            title: editing.title || '',
            description: editing.description || '',
            status: editing.status || 'TODO',
            assignedToUserId: editing.assignedToUserId || '',
            dueDate: isoToDateInput(editing.dueAt),
          }
        : { title: '', description: '', status: 'TODO', assignedToUserId: '', dueDate: '' },
    [editing],
  )

  const form = useForm({ resolver: zodResolver(schema), values: defaultValues })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      const payload = {
        title: values.title,
        description: values.description || null,
        status: values.status,
        assignedToUserId: values.assignedToUserId ? values.assignedToUserId : null,
        dueAt: toIsoOrNull(values.dueDate),
      }

      if (editing?.id) {
        return (await api.put(`/api/tasks/${editing.id}`, payload)).data
      }
      return (await api.post(`/api/projects/${projectId}/tasks`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      setOpen(false)
      setEditing(null)
      form.reset({ title: '', description: '', status: 'TODO', assignedToUserId: '', dueDate: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (taskId) => {
      await api.delete(`/api/tasks/${taskId}`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })

  function openCreate() {
    setEditing(null)
    setOpen(true)
    form.reset({ title: '', description: '', status: 'TODO', assignedToUserId: '', dueDate: '' })
  }

  function openEdit(t) {
    setEditing(t)
    setOpen(true)
    form.reset({
      title: t.title || '',
      description: t.description || '',
      status: t.status || 'TODO',
      assignedToUserId: t.assignedToUserId || '',
      dueDate: isoToDateInput(t.dueAt),
    })
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to manage workflow tasks.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workflow & MIS</h1>
          <p className="mt-1 text-sm text-slate-600">Track operational tasks, assignment, and progress per project.</p>
        </div>
        <Button onClick={openCreate}>New task</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tasksQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {tasksQuery.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={5}>
                    Failed to load tasks.
                  </td>
                </tr>
              ) : null}
              {!tasksQuery.isLoading && tasks.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={5}>
                    No tasks yet. Create one to start tracking the workflow.
                  </td>
                </tr>
              ) : null}
              {tasks.map((t) => (
                <tr key={t.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.title}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tone(t.status)}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{t.assignedToUsername || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deleteMutation.mutate(t.id)}
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
        title={editing ? 'Edit task' : 'New task'}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      >
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <Input {...form.register('title')} />
            {form.formState.errors.title ? (
              <div className="mt-1 text-xs text-rose-600">{form.formState.errors.title.message}</div>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Input {...form.register('description')} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                {...form.register('status')}
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due date</label>
              <Input type="date" {...form.register('dueDate')} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Assign to</label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              {...form.register('assignedToUserId')}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {saveMutation.isError ? (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {saveMutation.error?.response?.data?.message || 'Save failed.'}
            </div>
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


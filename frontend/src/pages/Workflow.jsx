import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'
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
  const toast = useToast()
  const [view, setView] = useState('board')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState('')
  const [query, setQuery] = useState('')
  const [updatingTaskId, setUpdatingTaskId] = useState('')

  const usersQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['assignable-users', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/assignable-users`)).data,
  })
  const users = usersQuery.data || []

  const tasksQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['tasks', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/tasks`)).data,
  })

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter((t) => {
      return (
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.assignedToUsername || '').toLowerCase().includes(q) ||
        String(t.status || '').toLowerCase().includes(q)
      )
    })
  }, [query, tasks])

  const tasksByStatus = useMemo(() => {
    const cols = { TODO: [], IN_PROGRESS: [], BLOCKED: [], DONE: [] }
    for (const t of filteredTasks) {
      cols[t.status] = cols[t.status] ?? []
      cols[t.status].push(t)
    }
    return cols
  }, [filteredTasks])

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
      toast.success('Saved', editing ? 'Task updated successfully.' : 'Task created successfully.')
      setEditing(null)
      form.reset({ title: '', description: '', status: 'TODO', assignedToUserId: '', dueDate: '' })
    },
    onError: (e) => toast.error('Save failed', e?.response?.data?.message || 'Unable to save task.'),
  })

  const quickUpdateMutation = useMutation({
    mutationFn: async ({ task, patch }) => {
      setUpdatingTaskId(task.id)
      const payload = {
        title: task.title,
        description: task.description || null,
        status: patch.status ?? task.status,
        assignedToUserId: patch.assignedToUserId ?? (task.assignedToUserId ? task.assignedToUserId : null),
        dueAt: patch.dueAt ?? (task.dueAt ? task.dueAt : null),
      }
      return (await api.put(`/api/tasks/${task.id}`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
    onError: (e) => toast.error('Update failed', e?.response?.data?.message || 'Unable to update task.'),
    onSettled: () => setUpdatingTaskId(''),
  })

  const deleteMutation = useMutation({
    mutationFn: async (taskId) => {
      await api.delete(`/api/tasks/${taskId}`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['tasks', projectId] })
      toast.success('Deleted', 'Task deleted successfully.')
    },
    onError: (e) => toast.error('Delete failed', e?.response?.data?.message || 'Unable to delete task.'),
  })

  function openCreate(status = 'TODO') {
    setEditing(null)
    setOpen(true)
    form.reset({ title: '', description: '', status, assignedToUserId: '', dueDate: '' })
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            className="sm:w-72"
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant={view === 'board' ? 'secondary' : 'outline'}
              onClick={() => setView('board')}
              type="button"
            >
              Board
            </Button>
            <Button
              variant={view === 'table' ? 'secondary' : 'outline'}
              onClick={() => setView('table')}
              type="button"
            >
              Table
            </Button>
          </div>
          <Button onClick={() => openCreate('TODO')}>New task</Button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'].map((status) => {
            const col = tasksByStatus[status] ?? []
            return (
              <Card key={status} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{status.replace('_', ' ')}</div>
                  <Badge tone={tone(status)}>{col.length}</Badge>
                </div>

                <div className="mt-3 space-y-2">
                  {tasksQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
                  {tasksQuery.isError ? <div className="text-sm text-rose-600">Failed to load tasks.</div> : null}

                  {!tasksQuery.isLoading && col.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      No tasks.
                    </div>
                  ) : null}

                  {col.map((t) => (
                    <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{t.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {t.assignedToUsername ? `Assigned: ${t.assignedToUsername}` : 'Unassigned'}
                            {' • '}
                            {t.dueAt ? `Due: ${new Date(t.dueAt).toLocaleDateString()}` : 'No due date'}
                          </div>
                        </div>
                        <Badge tone={tone(t.status)}>{t.status}</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={t.status}
                          disabled={quickUpdateMutation.isPending && updatingTaskId === t.id}
                          onChange={(e) => quickUpdateMutation.mutate({ task: t, patch: { status: e.target.value } })}
                          aria-label="Change status"
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="BLOCKED">BLOCKED</option>
                          <option value="DONE">DONE</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteId(t.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" size="sm" className="w-full" onClick={() => openCreate(status)}>
                    Add task
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
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
                      Loading...
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
                {!tasksQuery.isLoading && tasks.length > 0 && filteredTasks.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-slate-600" colSpan={5}>
                      No tasks found.
                    </td>
                  </tr>
                ) : null}
                {filteredTasks.map((t) => (
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
                          onClick={() => setConfirmDeleteId(t.id)}
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
      )}

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

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete task?"
        message="This will permanently delete the task."
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        danger
        onClose={() => setConfirmDeleteId('')}
        onConfirm={() => {
          deleteMutation.mutate(confirmDeleteId, { onSettled: () => setConfirmDeleteId('') })
        }}
      />
    </div>
  )
}

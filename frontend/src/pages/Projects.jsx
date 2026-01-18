import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import { useProject } from '../projects/ProjectContext'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED']).default('DRAFT'),
})

function statusTone(status) {
  if (status === 'COMPLETED') return 'green'
  if (status === 'IN_PROGRESS') return 'amber'
  return 'slate'
}

export function ProjectsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { projectId, setSelectedProjectId } = useProject()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data,
  })

  const clientsQuery = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/api/clients')).data,
  })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data])

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => {
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.clientName || '').toLowerCase().includes(q) ||
        (p.status || '').toLowerCase().includes(q)
      )
    })
  }, [projects, query])

  const defaultValues = useMemo(
    () =>
      editing
        ? {
            clientId: editing.clientId || '',
            name: editing.name || '',
            description: editing.description || '',
            status: editing.status || 'DRAFT',
          }
        : { clientId: '', name: '', description: '', status: 'DRAFT' },
    [editing],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), values: defaultValues })

  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (editing?.id) {
        return (
          await api.put(`/api/projects/${editing.id}`, {
            name: values.name,
            description: values.description,
            status: values.status,
          })
        ).data
      }
      return (
        await api.post('/api/projects', {
          clientId: values.clientId,
          name: values.name,
          description: values.description,
        })
      ).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['projects'] })
      setOpen(false)
      toast.success('Saved', editing ? 'Project updated successfully.' : 'Project created successfully.')
      setEditing(null)
      reset({ clientId: '', name: '', description: '', status: 'DRAFT' })
    },
  })

  function openCreate() {
    setEditing(null)
    setOpen(true)
    reset({ clientId: '', name: '', description: '', status: 'DRAFT' })
  }

  function openEdit(p) {
    setEditing(p)
    setOpen(true)
    reset({
      clientId: p.clientId || '',
      name: p.name || '',
      description: p.description || '',
      status: p.status || 'DRAFT',
    })
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">Track surveying projects, statuses, and deliverables.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            className="sm:w-72"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button onClick={openCreate}>New project</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {projectsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {projectsQuery.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={4}>
                    Failed to load projects.
                  </td>
                </tr>
              ) : null}
              {!projectsQuery.isLoading && projects.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={4}>
                    No projects yet. Create a project to start workflows.
                  </td>
                </tr>
              ) : null}
              {!projectsQuery.isLoading && projects.length > 0 && filteredProjects.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={4}>
                    No projects found.
                  </td>
                </tr>
              ) : null}
              {filteredProjects.map((p) => (
                <tr key={p.id} className={p.id === projectId ? 'bg-indigo-50' : 'bg-white'}>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-700">{p.clientName || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProjectId(p.id)
                          toast.success('Active project set', `Now working on: ${p.name}`)
                        }}
                      >
                        Set active
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProjectId(p.id)
                          nav('/workspace')
                        }}
                      >
                        Workspace
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        Edit
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
        title={editing ? 'Edit project' : 'New project'}
        onClose={() => {
          setOpen(false)
          setEditing(null)
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
          {!editing ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Client</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                {...register('clientId')}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.clientId ? <div className="mt-1 text-xs text-rose-600">{errors.clientId.message}</div> : null}
              {clients.length === 0 ? (
                <div className="mt-2 text-xs text-slate-500">Create a client first in the Clients module.</div>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium text-slate-700">Project name</label>
            <Input {...register('name')} />
            {errors.name ? <div className="mt-1 text-xs text-rose-600">{errors.name.message}</div> : null}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Input {...register('description')} />
          </div>

          {editing ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                {...register('status')}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          ) : null}

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

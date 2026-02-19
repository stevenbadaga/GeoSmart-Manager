import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const statusOptions = ['TODO', 'IN_PROGRESS', 'DONE']

export default function Workflow() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', assigneeEmail: '', dueDate: '' })

  const grouped = {
    TODO: tasks.filter((task) => task.status === 'TODO'),
    IN_PROGRESS: tasks.filter((task) => task.status === 'IN_PROGRESS'),
    DONE: tasks.filter((task) => task.status === 'DONE')
  }
  const totalTasks = tasks.length
  const progressRate = totalTasks ? Math.round((grouped.DONE.length / totalTasks) * 100) : 0

  useEffect(() => {
    api.get('/api/projects').then(setProjects).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    api.get(`/api/projects/${selectedProject}/tasks`)
      .then(setTasks)
      .catch((err) => setError(err.message))
  }, [selectedProject])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedProject) {
      setError('Select a project')
      return
    }
    try {
      await api.post(`/api/projects/${selectedProject}/tasks`, {
        ...form,
        dueDate: form.dueDate || null
      })
      setForm({ title: '', description: '', assigneeEmail: '', dueDate: '' })
      const updated = await api.get(`/api/projects/${selectedProject}/tasks`)
      setTasks(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  const updateStatus = async (taskId, status) => {
    setError('')
    try {
      await api.patch(`/api/tasks/${taskId}/status`, { status })
      const updated = await api.get(`/api/projects/${selectedProject}/tasks`)
      setTasks(updated)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Workflow</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">Field Workflow Board</h1>
        <p className="text-sm text-ink/60">Track surveying tasks from planning to delivery.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Total Tasks</p>
          <p className="text-2xl font-semibold text-ink mt-2">{totalTasks}</p>
          <p className="text-xs text-ink/60 mt-2">All workflow items</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">In Progress</p>
          <p className="text-2xl font-semibold text-ink mt-2">{grouped.IN_PROGRESS.length}</p>
          <p className="text-xs text-ink/60 mt-2">Active field operations</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Completion</p>
          <p className="text-2xl font-semibold text-ink mt-2">{progressRate}%</p>
          <p className="text-xs text-success mt-2">{grouped.DONE.length} tasks delivered</p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Task Board</h3>
              <p className="text-sm text-ink/60">Choose a project to view its workflow.</p>
            </div>
            <label className="block space-y-2 w-full md:w-72">
              <span className="text-sm font-medium">Project</span>
              <select className="input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            {statusOptions.map((status) => (
              <div key={status} className="rounded-xl border border-clay/60 bg-white/70 p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-ink">
                    {status === 'TODO' ? 'To Do' : status === 'IN_PROGRESS' ? 'In Progress' : 'Done'}
                  </p>
                  <span className="text-xs text-ink/50">{grouped[status].length}</span>
                </div>
                <div className="space-y-3">
                  {grouped[status].map((task) => (
                    <div key={task.id} className="border border-clay/60 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{task.title}</p>
                        <select
                          className="text-xs border border-clay rounded px-2 py-1"
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value)}
                        >
                          {statusOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-ink/60 mt-2">{task.description || 'No description provided'}</p>
                      <div className="flex items-center justify-between text-xs text-ink/50 mt-2">
                        <span>{task.assigneeEmail || 'Unassigned'}</span>
                        <span>{task.dueDate ? `Due ${task.dueDate}` : 'No due date'}</span>
                      </div>
                    </div>
                  ))}
                  {grouped[status].length === 0 && (
                    <p className="text-xs text-ink/50">No tasks in this stage.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Create Task">
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input label="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Input label="Assignee email" type="email" value={form.assigneeEmail} onChange={(e) => setForm({ ...form, assigneeEmail: e.target.value })} />
              <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              <label className="block space-y-2">
                <span className="text-sm font-medium">Description</span>
                <textarea className="input min-h-[90px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button className="w-full">Add task</Button>
            </form>
          </Card>
          <Card title="Workflow Tips">
            <div className="space-y-2 text-sm text-ink/70">
              <p>Assign tasks to specific surveyors to improve accountability.</p>
              <p>Use due dates to prioritize field deployments and reporting.</p>
              <p>Move tasks to Done when reports are uploaded and validated.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

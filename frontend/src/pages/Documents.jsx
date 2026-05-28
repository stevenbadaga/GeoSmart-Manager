import React, { useEffect, useState } from 'react'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { api } from '../api/http'

const documentTypes = ['Land title / proof of ownership', 'Parcel document', 'Academic data collection letter', 'Supporting maps', 'Zoning extract', 'Compliance report', 'Other supporting documents']

export default function Documents() {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState({ title: '', category: documentTypes[0], fileReference: '', notes: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/projects?includeArchived=true').then(setProjects).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProject) {
      setDocuments([])
      return
    }
    api.get(`/api/projects/${selectedProject}/documents`).then(setDocuments).catch((err) => setError(err.message))
  }, [selectedProject])

  const saveDocument = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!selectedProject) {
      setError('Select a project before adding a document reference.')
      return
    }
    try {
      await api.post(`/api/projects/${selectedProject}/documents`, {
        ...form,
        versionLabel: 'v1',
        approvalStatus: 'DRAFT'
      })
      const updated = await api.get(`/api/projects/${selectedProject}/documents`)
      setDocuments(updated)
      setForm({ title: '', category: documentTypes[0], fileReference: '', notes: '' })
      setMessage('Document reference saved. This does not officially validate ownership.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">Project Evidence</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Documents</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/75">Store project document references for review. GeoSmart Manager does not officially validate ownership or replace official document verification.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Document Library">
          <label className="mb-4 block max-w-md space-y-2">
            <span className="text-sm font-medium text-ink/80">Project</span>
            <select className="input" value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)}>
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="rounded-2xl border border-clay/70 bg-white/75 p-4">
                <p className="font-black text-ink">{document.title}</p>
                <p className="mt-1 text-xs text-[#124E44]">{document.category}</p>
                <p className="mt-2 text-sm text-ink/60">{document.fileReference || 'No file reference recorded.'}</p>
              </div>
            ))}
            {!documents.length && <p className="rounded-2xl border border-dashed border-clay/70 bg-sand/40 p-5 text-sm text-ink/60">No document references recorded for this project.</p>}
          </div>
        </Card>

        <Card title="Add Document Reference">
          <form className="space-y-4" onSubmit={saveDocument}>
            <Input label="Document title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Document type</span>
              <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <Input label="File reference or link" value={form.fileReference} onChange={(event) => setForm({ ...form, fileReference: event.target.value })} />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-ink/80">Notes</span>
              <textarea className="input min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}
            <Button className="w-full">Save document reference</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

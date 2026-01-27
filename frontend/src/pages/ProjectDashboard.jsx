import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { useToast } from '../components/ToastProvider'

async function downloadBlob(url, filename) {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(blobUrl)
}

function statusTone(status) {
  if (status === 'COMPLETED') return 'green'
  if (status === 'IN_PROGRESS') return 'amber'
  return 'slate'
}

function invoiceTone(status) {
  if (status === 'PAID') return 'green'
  if (status === 'OVERDUE') return 'red'
  if (status === 'SENT') return 'amber'
  return 'slate'
}

export function ProjectDashboardPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const { projectId } = useProject()

  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('OTHER')
  const [docFile, setDocFile] = useState(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null)

  const [messageText, setMessageText] = useState('')
  const [messageVisibility, setMessageVisibility] = useState('CLIENT_VISIBLE')

  const [openInvoice, setOpenInvoice] = useState(false)
  const [openPayment, setOpenPayment] = useState(false)
  const [activeInvoiceId, setActiveInvoiceId] = useState('')
  const [invoiceDraft, setInvoiceDraft] = useState({
    invoiceNumber: '',
    status: 'DRAFT',
    currency: 'RWF',
    amount: '',
    dueDate: '',
    notes: '',
  })
  const [paymentDraft, setPaymentDraft] = useState({ amount: '', method: '', reference: '' })

  const isClient = user?.role === 'CLIENT'
  const canManageProject = !isClient

  const projectQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}`)).data,
  })

  const docsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-docs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/documents`)).data,
  })

  const messagesQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-messages', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/messages`)).data,
  })

  const invoicesQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-invoices', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/invoices`)).data,
  })

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.set('name', docName || (docFile?.name ?? 'Document'))
      form.set('docType', docType)
      form.set('file', docFile)
      return (await api.post(`/api/projects/${projectId}/documents`, form)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-docs', projectId] })
      setDocName('')
      setDocType('OTHER')
      setDocFile(null)
      toast.success('Uploaded', 'Document uploaded successfully.')
    },
    onError: (e) => toast.error('Upload failed', e?.response?.data?.message || 'Unable to upload document.'),
  })

  const deleteDocMutation = useMutation({
    mutationFn: async (docId) => (await api.delete(`/api/projects/${projectId}/documents/${docId}`)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-docs', projectId] })
      toast.success('Deleted', 'Document deleted.')
    },
    onError: (e) => toast.error('Delete failed', e?.response?.data?.message || 'Unable to delete document.'),
  })

  const postMessageMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/api/projects/${projectId}/messages`, { visibility: messageVisibility, message: messageText })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-messages', projectId] })
      setMessageText('')
      toast.success('Sent', 'Message posted.')
    },
    onError: (e) => toast.error('Send failed', e?.response?.data?.message || 'Unable to post message.'),
  })

  const createInvoiceMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/api/projects/${projectId}/invoices`, {
          invoiceNumber: invoiceDraft.invoiceNumber,
          status: invoiceDraft.status,
          currency: invoiceDraft.currency,
          amount: Number(invoiceDraft.amount || 0),
          dueDate: invoiceDraft.dueDate ? invoiceDraft.dueDate : null,
          notes: invoiceDraft.notes || null,
        })
      ).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-invoices', projectId] })
      setOpenInvoice(false)
      setInvoiceDraft({ invoiceNumber: '', status: 'DRAFT', currency: 'RWF', amount: '', dueDate: '', notes: '' })
      toast.success('Created', 'Invoice created.')
    },
    onError: (e) => toast.error('Create failed', e?.response?.data?.message || 'Unable to create invoice.'),
  })

  const addPaymentMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/api/projects/${projectId}/invoices/${activeInvoiceId}/payments`, {
          amount: Number(paymentDraft.amount || 0),
          method: paymentDraft.method || null,
          reference: paymentDraft.reference || null,
          paidAt: null,
        })
      ).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-invoices', projectId] })
      setOpenPayment(false)
      setActiveInvoiceId('')
      setPaymentDraft({ amount: '', method: '', reference: '' })
      toast.success('Added', 'Payment recorded.')
    },
    onError: (e) => toast.error('Payment failed', e?.response?.data?.message || 'Unable to add payment.'),
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to view its dashboard, documents, messages, and invoices.</p>
        </Card>
      </div>
    )
  }

  const project = projectQuery.data
  const documents = useMemo(() => docsQuery.data ?? [], [docsQuery.data])
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])
  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data])

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Client transparency, documents, communication, and financial tracking.</p>
        </div>
        {project ? (
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(project.status)}>{project.status}</Badge>
            {project.archived ? <Badge tone="red">ARCHIVED</Badge> : null}
          </div>
        ) : null}
      </div>

      <Card className="p-6">
        {projectQuery.isLoading ? (
          <div className="text-sm text-slate-600">Loading project…</div>
        ) : projectQuery.isError ? (
          <div className="text-sm text-rose-700">Unable to load project.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{project?.name}</div>
              <div className="mt-1 text-sm text-slate-700">{project?.description || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{project?.clientName}</div>
              <div className="mt-1 text-sm text-slate-700">{project?.location || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</div>
              <div className="mt-1 text-sm text-slate-700">
                {project?.startDate || '—'} → {project?.endDate || '—'}
              </div>
              <div className="mt-1 text-sm text-slate-700">Type: {project?.type || '—'}</div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Documents</div>
              <div className="mt-1 text-sm text-slate-600">Deeds, titles, approvals, and project files.</div>
            </div>
          </div>

          {canManageProject ? (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g., Land Title" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    <option value="DEED">DEED</option>
                    <option value="TITLE">TITLE</option>
                    <option value="APPROVAL">APPROVAL</option>
                    <option value="CONTRACT">CONTRACT</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">File</label>
                <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => uploadDocMutation.mutate()} disabled={!docFile || uploadDocMutation.isPending}>
                  {uploadDocMutation.isPending ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-600">Client view: documents are read-only.</div>
          )}

          <div className="mt-4 space-y-2">
            {docsQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
            {!docsQuery.isLoading && documents.length === 0 ? <div className="text-sm text-slate-600">No documents yet.</div> : null}
            {documents.map((d) => (
              <div key={d.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{d.name}</div>
                  <div className="truncate text-xs text-slate-600">{d.originalFilename}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="slate">{d.docType}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadBlob(`/api/projects/${projectId}/documents/${d.id}/download`, d.originalFilename)}
                  >
                    Download
                  </Button>
                  {canManageProject ? (
                    <Button size="sm" variant="danger" onClick={() => setConfirmDeleteDoc(d)}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-slate-900">Communication</div>
          <div className="mt-1 text-sm text-slate-600">Client communication log with visibility controls.</div>

          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {!isClient ? (
              <div>
                <label className="text-sm font-medium text-slate-700">Visibility</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={messageVisibility}
                  onChange={(e) => setMessageVisibility(e.target.value)}
                >
                  <option value="CLIENT_VISIBLE">CLIENT_VISIBLE</option>
                  <option value="INTERNAL">INTERNAL</option>
                </select>
              </div>
            ) : (
              <div className="text-xs text-slate-600">Client messages are always client-visible.</div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Message</label>
              <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type a message…" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => postMessageMutation.mutate()} disabled={!messageText || postMessageMutation.isPending}>
                {postMessageMutation.isPending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {messagesQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
            {!messagesQuery.isLoading && messages.length === 0 ? <div className="text-sm text-slate-600">No messages yet.</div> : null}
            {messages.map((m) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    {m.actorUsername || 'User'} • {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                  </div>
                  <Badge tone={m.visibility === 'CLIENT_VISIBLE' ? 'blue' : 'slate'}>{m.visibility}</Badge>
                </div>
                <div className="mt-2 text-sm text-slate-800">{m.message}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Invoices & Payments</div>
            <div className="mt-1 text-sm text-slate-600">Track invoices, due dates, and payment records.</div>
          </div>
          {canManageProject ? (
            <Button onClick={() => setOpenInvoice(true)} size="sm">
              New invoice
            </Button>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {invoicesQuery.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
          {!invoicesQuery.isLoading && invoices.length === 0 ? <div className="text-sm text-slate-600">No invoices yet.</div> : null}
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{inv.invoiceNumber}</div>
                  <div className="text-xs text-slate-600">
                    {inv.currency} {inv.amount.toFixed(2)} • Due: {inv.dueDate || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={invoiceTone(inv.status)}>{inv.status}</Badge>
                  {canManageProject ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveInvoiceId(inv.id)
                        setOpenPayment(true)
                      }}
                    >
                      Add payment
                    </Button>
                  ) : null}
                </div>
              </div>

              {inv.payments?.length > 0 ? (
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Method</th>
                        <th className="px-3 py-2">Reference</th>
                        <th className="px-3 py-2">Paid at</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {inv.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-slate-700">
                            {inv.currency} {p.amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{p.method || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-700">{p.reference || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteDoc}
        title="Delete document?"
        message={confirmDeleteDoc ? `This will permanently delete "${confirmDeleteDoc.name}".` : 'This will delete the document.'}
        confirmLabel={deleteDocMutation.isPending ? 'Deleting…' : 'Delete'}
        danger
        onClose={() => setConfirmDeleteDoc(null)}
        onConfirm={() => {
          if (!confirmDeleteDoc) return
          deleteDocMutation.mutate(confirmDeleteDoc.id, { onSettled: () => setConfirmDeleteDoc(null) })
        }}
      />

      <Modal open={openInvoice} title="New invoice" onClose={() => setOpenInvoice(false)}>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Invoice number</label>
              <Input value={invoiceDraft.invoiceNumber} onChange={(e) => setInvoiceDraft((d) => ({ ...d, invoiceNumber: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={invoiceDraft.status}
                onChange={(e) => setInvoiceDraft((d) => ({ ...d, status: e.target.value }))}
              >
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <Input value={invoiceDraft.currency} onChange={(e) => setInvoiceDraft((d) => ({ ...d, currency: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <Input value={invoiceDraft.amount} onChange={(e) => setInvoiceDraft((d) => ({ ...d, amount: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Due date</label>
            <Input type="date" value={invoiceDraft.dueDate} onChange={(e) => setInvoiceDraft((d) => ({ ...d, dueDate: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <Input value={invoiceDraft.notes} onChange={(e) => setInvoiceDraft((d) => ({ ...d, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpenInvoice(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => createInvoiceMutation.mutate()}
              disabled={createInvoiceMutation.isPending || !invoiceDraft.invoiceNumber}
            >
              {createInvoiceMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={openPayment} title="Add payment" onClose={() => setOpenPayment(false)}>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="text-sm font-medium text-slate-700">Amount</label>
            <Input value={paymentDraft.amount} onChange={(e) => setPaymentDraft((d) => ({ ...d, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Method</label>
              <Input value={paymentDraft.method} onChange={(e) => setPaymentDraft((d) => ({ ...d, method: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Reference</label>
              <Input value={paymentDraft.reference} onChange={(e) => setPaymentDraft((d) => ({ ...d, reference: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpenPayment(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => addPaymentMutation.mutate()} disabled={addPaymentMutation.isPending || !paymentDraft.amount}>
              {addPaymentMutation.isPending ? 'Saving…' : 'Save payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}


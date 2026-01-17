import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useToast } from '../components/ToastProvider'

function tone(type) {
  if (type === 'SUBDIVISION_SUMMARY') return 'blue'
  if (type === 'COMPLIANCE_SUMMARY') return 'amber'
  return 'slate'
}

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

export function ReportsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { projectId } = useProject()
  const [type, setType] = useState('SUBDIVISION_SUMMARY')
  const [runId, setRunId] = useState('')

  const reportsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['reports', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/reports`)).data,
  })

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const runs = runsQuery.data || []
  const selectedRunId = useMemo(() => runId || '', [runId])

  const generateMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post(`/api/projects/${projectId}/reports/generate`, {
          type,
          subdivisionRunId: type === 'SUBDIVISION_SUMMARY' ? selectedRunId || null : null,
        })
      ).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reports', projectId] })
      toast.success('Report generated', 'PDF report created successfully.')
    },
    onError: (e) => toast.error('Report failed', e?.response?.data?.message || 'Unable to generate report.'),
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to generate reports.</p>
        </Card>
      </div>
    )
  }

  const reports = reportsQuery.data || []

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Generate PDF reports for subdivision and compliance outcomes.</p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <label className="text-sm font-medium text-slate-700">Report type</label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="SUBDIVISION_SUMMARY">SUBDIVISION_SUMMARY</option>
              <option value="COMPLIANCE_SUMMARY">COMPLIANCE_SUMMARY</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Subdivision run (optional)</label>
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={selectedRunId}
              onChange={(e) => setRunId(e.target.value)}
              disabled={type !== 'SUBDIVISION_SUMMARY'}
            >
              <option value="">Latest run</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} — {r.status}
                </option>
              ))}
            </select>
          </div>

          <Button disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
            {generateMutation.isPending ? 'Generating…' : 'Generate PDF'}
          </Button>
        </div>

        {generateMutation.isError ? (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {generateMutation.error?.response?.data?.message || 'Report generation failed.'}
          </div>
        ) : null}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={3}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {reportsQuery.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={3}>
                    Failed to load reports.
                  </td>
                </tr>
              ) : null}
              {!reportsQuery.isLoading && reports.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={3}>
                    No reports yet.
                  </td>
                </tr>
              ) : null}
              {reports.map((r) => (
                <tr key={r.id} className="bg-white">
                  <td className="px-4 py-3">
                    <Badge tone={tone(r.type)}>{r.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBlob(`/api/reports/${r.id}/download`, `geosmart-${r.type.toLowerCase()}.pdf`)}
                    >
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

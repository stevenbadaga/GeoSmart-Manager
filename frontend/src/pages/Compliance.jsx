import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

function tone(status) {
  if (status === 'PASSED') return 'green'
  if (status === 'FAILED') return 'red'
  return 'amber'
}

function parseIssues(issuesJson) {
  if (!issuesJson) return []
  try {
    const v = JSON.parse(issuesJson)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function CompliancePage() {
  const qc = useQueryClient()
  const { projectId } = useProject()
  const [runId, setRunId] = useState('')

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const complianceQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['compliance', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/compliance`)).data,
  })

  const runs = runsQuery.data || []
  const selectedRunId = useMemo(() => runId || runs[0]?.id || '', [runId, runs])

  const checkMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post(`/api/projects/${projectId}/compliance/check`, {
          subdivisionRunId: selectedRunId,
        })
      ).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['compliance', projectId] })
    },
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to run compliance checks.</p>
        </Card>
      </div>
    )
  }

  const checks = complianceQuery.data || []

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Regulatory Compliance</h1>
        <p className="mt-1 text-sm text-slate-600">Validate subdivision outputs against configurable rules (prototype: min area).</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Subdivision run</label>
            <select
              className="mt-1 h-10 w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={selectedRunId}
              onChange={(e) => setRunId(e.target.value)}
            >
              <option value="">Select a run…</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} — {r.status} — parcels {r.targetParcels}
                </option>
              ))}
            </select>
            {runs.length === 0 ? <div className="mt-2 text-xs text-slate-500">Run subdivision first.</div> : null}
          </div>
          <Button disabled={!selectedRunId || checkMutation.isPending} onClick={() => checkMutation.mutate()}>
            {checkMutation.isPending ? 'Checking…' : 'Run compliance check'}
          </Button>
        </div>

        {checkMutation.isError ? (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {checkMutation.error?.response?.data?.message || 'Compliance check failed.'}
          </div>
        ) : null}
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Issues</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {complianceQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : null}
              {complianceQuery.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={4}>
                    Failed to load compliance checks.
                  </td>
                </tr>
              ) : null}
              {!complianceQuery.isLoading && checks.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={4}>
                    No compliance checks yet.
                  </td>
                </tr>
              ) : null}
              {checks.map((c) => {
                const issues = parseIssues(c.issuesJson)
                return (
                  <tr key={c.id} className="bg-white">
                    <td className="px-4 py-3">
                      <Badge tone={tone(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.subdivisionRunId?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-700">{issues.length}</td>
                    <td className="px-4 py-3">
                      <details className="text-sm text-slate-700">
                        <summary className="cursor-pointer select-none text-indigo-700 hover:text-indigo-900">View</summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                          {JSON.stringify(issues, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}


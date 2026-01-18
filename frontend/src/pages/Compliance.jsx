import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { useToast } from '../components/ToastProvider'

function tone(status) {
  if (status === 'PASSED') return 'green'
  if (status === 'FAILED') return 'red'
  return 'amber'
}

function severityTone(severity) {
  if (severity === 'ERROR') return 'red'
  if (severity === 'WARNING') return 'amber'
  return 'slate'
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

function countIssues(issues) {
  return issues.reduce(
    (acc, it) => {
      const sev = String(it?.severity || '').toUpperCase()
      if (sev === 'ERROR') acc.errors += 1
      else if (sev === 'WARNING') acc.warnings += 1
      else acc.other += 1
      return acc
    },
    { errors: 0, warnings: 0, other: 0 },
  )
}

function downloadText(text, filename, mime = 'application/octet-stream') {
  const blob = new Blob([text], { type: mime })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export function CompliancePage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { projectId } = useProject()
  const [runId, setRunId] = useState('')
  const [cfgDraft, setCfgDraft] = useState(null)

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

  const configQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['compliance-config', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/compliance/config`)).data,
  })

  const defaultCfgDraft = useMemo(() => {
    const d = configQuery.data
    return {
      minParcelArea: d?.minParcelArea ?? 200,
      maxParcelArea: d?.maxParcelArea == null ? '' : String(d.maxParcelArea),
      expectedParcelCount: d?.expectedParcelCount == null ? '' : String(d.expectedParcelCount),
    }
  }, [configQuery.data])

  const effectiveCfgDraft = cfgDraft ?? defaultCfgDraft

  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data])
  const selectedRunId = useMemo(() => runId || runs[0]?.id || '', [runId, runs])

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        minParcelArea: Number(effectiveCfgDraft.minParcelArea || 0),
        maxParcelArea: effectiveCfgDraft.maxParcelArea === '' ? null : Number(effectiveCfgDraft.maxParcelArea),
        expectedParcelCount: effectiveCfgDraft.expectedParcelCount === '' ? null : Number(effectiveCfgDraft.expectedParcelCount),
      }
      return (await api.put(`/api/projects/${projectId}/compliance/config`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['compliance-config', projectId] })
      toast.success('Saved', 'Compliance rules updated.')
    },
    onError: (e) => toast.error('Save failed', e?.response?.data?.message || 'Unable to save compliance rules.'),
  })

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
      toast.success('Compliance checked', 'Compliance check saved.')
    },
    onError: (e) => toast.error('Compliance failed', e?.response?.data?.message || 'Unable to run compliance check.'),
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
        <p className="mt-1 text-sm text-slate-600">Validate subdivision outputs against configurable rules (min/max area, parcel count).</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">Compliance rules</div>
            <div className="mt-1 text-xs text-slate-500">
              Configure project-level rules used during compliance checks.
              {configQuery.data?.updatedAt ? ` Last updated: ${new Date(configQuery.data.updatedAt).toLocaleString()}` : ''}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Min area (sqm)</label>
                <Input
                  type="number"
                  min={1}
                  value={effectiveCfgDraft.minParcelArea}
                  onChange={(e) => setCfgDraft((p) => ({ ...(p ?? defaultCfgDraft), minParcelArea: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Max area (sqm)</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="(optional)"
                  value={effectiveCfgDraft.maxParcelArea}
                  onChange={(e) => setCfgDraft((p) => ({ ...(p ?? defaultCfgDraft), maxParcelArea: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Expected parcels</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="(optional)"
                  value={effectiveCfgDraft.expectedParcelCount}
                  onChange={(e) =>
                    setCfgDraft((p) => ({ ...(p ?? defaultCfgDraft), expectedParcelCount: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={configQuery.isLoading || saveConfigMutation.isPending}
              onClick={() => {
                setCfgDraft(null)
              }}
            >
              Reset
            </Button>
            <Button disabled={saveConfigMutation.isPending} onClick={() => saveConfigMutation.mutate()}>
              {saveConfigMutation.isPending ? 'Saving...' : 'Save rules'}
            </Button>
          </div>
        </div>

        {configQuery.isError ? (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">Failed to load compliance rules.</div>
        ) : null}
      </Card>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700">Subdivision run</label>
            <select
              className="mt-1 h-10 w-full max-w-lg rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={selectedRunId}
              onChange={(e) => setRunId(e.target.value)}
            >
              <option value="">Select a run...</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} - {r.status} - parcels {r.targetParcels}
                </option>
              ))}
            </select>
            {runs.length === 0 ? <div className="mt-2 text-xs text-slate-500">Run subdivision first.</div> : null}
          </div>
          <Button disabled={!selectedRunId || checkMutation.isPending} onClick={() => checkMutation.mutate()}>
            {checkMutation.isPending ? 'Checking...' : 'Run compliance check'}
          </Button>
        </div>
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
                    Loading...
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
                const counts = countIssues(issues)
                return (
                  <tr key={c.id} className="bg-white">
                    <td className="px-4 py-3">
                      <Badge tone={tone(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.subdivisionRunId?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        <span>{issues.length}</span>
                        {counts.errors > 0 ? <Badge tone="red">Errors {counts.errors}</Badge> : null}
                        {counts.warnings > 0 ? <Badge tone="amber">Warnings {counts.warnings}</Badge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <details className="text-sm text-slate-700">
                        <summary className="cursor-pointer select-none text-indigo-700 hover:text-indigo-900">View</summary>
                        <div className="mt-3 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                downloadText(JSON.stringify(issues, null, 2), `compliance-${c.id.slice(0, 8)}.json`, 'application/json')
                              }
                            >
                              Download JSON
                            </Button>
                          </div>

                          {issues.length === 0 ? (
                            <div className="text-sm text-slate-600">No issues.</div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                              <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  <tr>
                                    <th className="px-3 py-2">Severity</th>
                                    <th className="px-3 py-2">Rule</th>
                                    <th className="px-3 py-2">Message</th>
                                    <th className="px-3 py-2">Parcel</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                  {issues.map((it, idx) => (
                                    <tr key={idx}>
                                      <td className="px-3 py-2">
                                        <Badge tone={severityTone(String(it?.severity || '').toUpperCase())}>
                                          {String(it?.severity || 'INFO').toUpperCase()}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 font-medium text-slate-900">{it?.rule || '—'}</td>
                                      <td className="px-3 py-2 text-slate-700">{it?.message || '—'}</td>
                                      <td className="px-3 py-2 text-slate-700">{it?.parcelNo ?? it?.parcelIndex ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
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

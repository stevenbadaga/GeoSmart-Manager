import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { api } from '../api/http'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'

function StatCard({ label, value }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </Card>
  )
}

function StepRow({ done, title, description, actionLabel, onAction, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5">
          {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-sm text-slate-600">{description}</div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onAction} disabled={disabled}>
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function DashboardPage() {
  const nav = useNavigate()
  const { projectId } = useProject()

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/api/dashboard/summary')).data,
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data,
  })

  const datasetsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['datasets', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/datasets`)).data,
  })

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

  const reportsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['reports', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/reports`)).data,
  })

  const summary = summaryQuery.data
  const activeProject = useMemo(() => {
    const list = projectsQuery.data ?? []
    return list.find((p) => p.id === projectId) ?? null
  }, [projectsQuery.data, projectId])

  const datasets = datasetsQuery.data ?? []
  const runs = runsQuery.data ?? []
  const checks = complianceQuery.data ?? []
  const reports = reportsQuery.data ?? []

  const latestRun = runs[0] ?? null
  const latestCheck = checks[0] ?? null

  const hasDataset = datasets.length > 0
  const hasRun = runs.length > 0
  const hasCompliance = checks.length > 0
  const hasReport = reports.length > 0

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">A quick overview and a guided prototype workflow for GeoSmart-Manager.</p>
      </div>

      {summaryQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
      {summaryQuery.isError ? <div className="text-sm text-rose-600">Failed to load dashboard.</div> : null}

      {summary ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Clients" value={summary.clients} />
          <StatCard label="Projects" value={summary.projects} />
          <StatCard label="Datasets" value={summary.datasets} />
          <StatCard label="Workflow Tasks" value={summary.tasks} />
          <StatCard label="Subdivision Runs" value={summary.subdivisionRuns} />
          <StatCard label="Compliance Checks" value={summary.complianceChecks} />
          <StatCard label="Reports" value={summary.reports} />
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Active project</div>
              <div className="mt-1 text-sm text-slate-600">
                {activeProject ? (
                  <>
                    <span className="font-medium text-slate-900">{activeProject.name}</span>
                    <span className="text-slate-500"> • </span>
                    <Badge tone={activeProject.status === 'COMPLETED' ? 'green' : activeProject.status === 'IN_PROGRESS' ? 'amber' : 'slate'}>
                      {activeProject.status}
                    </Badge>
                  </>
                ) : (
                  <span className="text-slate-500">Select a project in the top bar.</span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => nav('/projects')}>
              Manage
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Datasets</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{projectId ? datasets.length : '—'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Runs</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{projectId ? runs.length : '—'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compliance</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{projectId ? checks.length : '—'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reports</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{projectId ? reports.length : '—'}</div>
            </div>
          </div>

          {projectId ? (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span>Latest subdivision</span>
                <span className="font-medium text-slate-900">{latestRun ? latestRun.status : '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Latest compliance</span>
                <span className="font-medium text-slate-900">{latestCheck ? latestCheck.status : '—'}</span>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-slate-900">Prototype workflow</div>
          <div className="mt-1 text-sm text-slate-600">Follow these steps to demo the full system end-to-end.</div>

          <div className="mt-4 space-y-3">
            <StepRow
              done={hasDataset}
              title="Upload cadastral dataset"
              description="Upload a boundary GeoJSON in Map Workspace."
              actionLabel="Open workspace"
              onAction={() => nav('/workspace')}
              disabled={!projectId}
            />
            <StepRow
              done={hasRun}
              title="Run AI subdivision"
              description="Generate an automated parcel subdivision proposal."
              actionLabel="Run subdivision"
              onAction={() => nav('/subdivision')}
              disabled={!projectId || !hasDataset}
            />
            <StepRow
              done={hasCompliance}
              title="Run compliance checks"
              description="Validate the output against project-level rules."
              actionLabel="Check compliance"
              onAction={() => nav('/compliance')}
              disabled={!projectId || !hasRun}
            />
            <StepRow
              done={hasReport}
              title="Generate PDF report"
              description="Create professional reports for the project deliverables."
              actionLabel="Generate report"
              onAction={() => nav('/reports')}
              disabled={!projectId}
            />
          </div>

          {!projectId ? (
            <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Select an active project in the top bar to enable workflow steps.
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

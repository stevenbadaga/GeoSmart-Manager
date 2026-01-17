import { useQuery } from '@tanstack/react-query'
import { api } from '../api/http'
import { Card } from '../components/Card'

function StatCard({ label, value }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </Card>
  )
}

export function DashboardPage() {
  const q = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/api/dashboard/summary')).data,
  })

  const d = q.data

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Overview of clients, projects, datasets, and workflows.</p>
      </div>

      {q.isLoading ? <div className="text-sm text-slate-600">Loading…</div> : null}
      {q.isError ? <div className="text-sm text-rose-600">Failed to load dashboard.</div> : null}

      {d ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Clients" value={d.clients} />
          <StatCard label="Projects" value={d.projects} />
          <StatCard label="Datasets" value={d.datasets} />
          <StatCard label="Workflow Tasks" value={d.tasks} />
          <StatCard label="Subdivision Runs" value={d.subdivisionRuns} />
          <StatCard label="Compliance Checks" value={d.complianceChecks} />
          <StatCard label="Reports" value={d.reports} />
        </div>
      ) : null}

      <Card className="mt-6 p-5">
        <div className="text-sm font-semibold text-slate-900">Recommended demo flow</div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Create a Client</li>
          <li>Create a Project</li>
          <li>Upload cadastral GeoJSON in Map Workspace</li>
          <li>Run AI Subdivision and review parcels</li>
          <li>Run Compliance Check</li>
          <li>Generate a PDF report</li>
        </ol>
      </Card>
    </div>
  )
}

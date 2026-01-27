import { useQuery } from '@tanstack/react-query'
import { api } from '../api/http'
import { Card } from '../components/Card'

export function AdminAuditPage() {
  const q = useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await api.get('/api/audit?page=0&size=100')).data,
  })

  const rows = q.data || []

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-600">Security and traceability for critical actions.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {q.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-600" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : null}
              {q.isError ? (
                <tr>
                  <td className="px-4 py-4 text-rose-600" colSpan={5}>
                    Failed to load audit logs.
                  </td>
                </tr>
              ) : null}
              {!q.isLoading && rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-600" colSpan={5}>
                    No audit logs yet.
                  </td>
                </tr>
              ) : null}
              {rows.map((a) => (
                <tr key={a.id} className="bg-white">
                  <td className="px-4 py-3 text-slate-700">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{a.actorUsername || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{a.action}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {a.entityType} {a.entityId ? a.entityId.slice(0, 8) : ''}
                  </td>
                  <td className="px-4 py-3">
                    <details className="text-sm text-slate-700">
                      <summary className="cursor-pointer select-none text-indigo-700 hover:text-indigo-900">View</summary>
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                        {a.detailsJson || '{}'}
                      </pre>
                    </details>
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

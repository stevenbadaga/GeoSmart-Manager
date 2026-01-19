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
import { useToast } from '../components/ToastProvider'

function projectRoleTone(role) {
  if (role === 'PROJECT_ADMIN') return 'blue'
  if (role === 'ENGINEER') return 'green'
  return 'slate'
}

function userRoleTone(role) {
  if (role === 'ADMIN') return 'blue'
  return 'slate'
}

const PROJECT_ROLES = ['PROJECT_ADMIN', 'ENGINEER', 'VIEWER']

export function ProjectTeamPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const { projectId } = useProject()

  const [directoryQuery, setDirectoryQuery] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('ENGINEER')
  const [confirmRemove, setConfirmRemove] = useState(null)

  const membersQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-members', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/members`)).data,
  })

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const isGlobalAdmin = user?.role === 'ADMIN'

  const myProjectRole = useMemo(() => {
    if (isGlobalAdmin) return 'PROJECT_ADMIN'
    const me = members.find((m) => m.userId === user?.id)
    return me?.projectRole || null
  }, [isGlobalAdmin, members, user?.id])

  const canManage = isGlobalAdmin || myProjectRole === 'PROJECT_ADMIN'

  const directoryQueryEnabled = !!projectId && canManage && directoryQuery.trim().length >= 2
  const directoryUsersQuery = useQuery({
    enabled: directoryQueryEnabled,
    queryKey: ['user-directory', projectId, directoryQuery.trim().toLowerCase()],
    queryFn: async () =>
      (await api.get(`/api/projects/${projectId}/user-directory`, { params: { q: directoryQuery.trim() } })).data,
    retry: false,
  })

  const directoryUsers = useMemo(() => directoryUsersQuery.data ?? [], [directoryUsersQuery.data])

  const existingUserIds = useMemo(() => new Set(members.map((m) => m.userId)), [members])
  const filteredDirectoryUsers = useMemo(
    () => directoryUsers.filter((u) => !existingUserIds.has(u.id)),
    [directoryUsers, existingUserIds],
  )

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, projectRole }) =>
      (await api.post(`/api/projects/${projectId}/members`, { userId, projectRole })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Member added', 'User added to project successfully.')
    },
    onError: (e) => toast.error('Add failed', e?.response?.data?.message || 'Unable to add member.'),
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, projectRole }) =>
      (await api.patch(`/api/projects/${projectId}/members/${memberId}`, { projectRole })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Updated', 'Member role updated.')
    },
    onError: (e) => toast.error('Update failed', e?.response?.data?.message || 'Unable to update role.'),
  })

  const removeMutation = useMutation({
    mutationFn: async (memberId) => (await api.delete(`/api/projects/${projectId}/members/${memberId}`)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('Removed', 'Member removed from project.')
    },
    onError: (e) => toast.error('Remove failed', e?.response?.data?.message || 'Unable to remove member.'),
  })

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to manage its team members.</p>
        </Card>
      </div>
    )
  }

  if (membersQuery.isError) {
    const msg = membersQuery.error?.response?.data?.message || 'Unable to load project members.'
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Project access required</div>
          <p className="mt-2 text-sm text-slate-600">{msg}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Project Team</h1>
        <p className="mt-1 text-sm text-slate-600">Manage members and project-scoped roles for the active project.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Members</div>
              <div className="flex items-center gap-2">
                <Badge tone={canManage ? 'blue' : 'slate'}>{canManage ? 'Manage' : 'Read-only'}</Badge>
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-500">At least one PROJECT_ADMIN is required per project.</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Global role</th>
                  <th className="px-4 py-3">Project role</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {membersQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-slate-600" colSpan={4}>
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!membersQuery.isLoading && members.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-600" colSpan={4}>
                      No members found.
                    </td>
                  </tr>
                ) : null}

                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">{m.username}</div>
                        <div className="truncate text-xs text-slate-600">{m.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={userRoleTone(m.userRole)}>{m.userRole}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          value={m.projectRole}
                          onChange={(e) => updateRoleMutation.mutate({ memberId: m.id, projectRole: e.target.value })}
                          disabled={updateRoleMutation.isPending}
                          title="Change project role"
                        >
                          {PROJECT_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={projectRoleTone(m.projectRole)}>{m.projectRole}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <Button variant="danger" size="sm" onClick={() => setConfirmRemove(m)} disabled={removeMutation.isPending}>
                          Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-slate-900">Add member</div>
          <p className="mt-1 text-sm text-slate-600">Search by username or email and assign a project role.</p>

          {!canManage ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              Only project admins can add or remove members.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Search</label>
                  <Input
                    placeholder="Type at least 2 characters..."
                    value={directoryQuery}
                    onChange={(e) => setDirectoryQuery(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Project role</label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                  >
                    {PROJECT_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {directoryQuery.trim().length > 0 && directoryQuery.trim().length < 2 ? (
                <div className="text-xs text-slate-500">Keep typing to search the user directory.</div>
              ) : null}

              {directoryUsersQuery.isFetching ? <div className="text-sm text-slate-600">Searching...</div> : null}
              {directoryUsersQuery.isError ? (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {directoryUsersQuery.error?.response?.data?.message || 'User directory unavailable.'}
                </div>
              ) : null}

              {directoryQueryEnabled && !directoryUsersQuery.isLoading && filteredDirectoryUsers.length === 0 ? (
                <div className="text-sm text-slate-600">No users found.</div>
              ) : null}

              <div className="space-y-2">
                {filteredDirectoryUsers.slice(0, 20).map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{u.username}</div>
                      <div className="truncate text-xs text-slate-600">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={userRoleTone(u.role)}>{u.role}</Badge>
                      <Button
                        size="sm"
                        onClick={() => addMemberMutation.mutate({ userId: u.id, projectRole: newMemberRole })}
                        disabled={addMemberMutation.isPending}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove member?"
        message={
          confirmRemove
            ? `This will remove ${confirmRemove.username} from the project. They will lose access immediately.`
            : 'This will remove the member.'
        }
        confirmLabel={removeMutation.isPending ? 'Removing...' : 'Remove'}
        danger
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (!confirmRemove) return
          removeMutation.mutate(confirmRemove.id, { onSettled: () => setConfirmRemove(null) })
        }}
      />
    </div>
  )
}


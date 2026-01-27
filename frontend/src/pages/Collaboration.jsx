import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import { useProject } from '../projects/ProjectContext'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Modal } from '../components/Modal'
import { useToast } from '../components/ToastProvider'

function toneVisibility(v) {
  if (v === 'CLIENT_VISIBLE') return 'blue'
  if (v === 'INTERNAL') return 'slate'
  return 'slate'
}

function toneApprovalStatus(s) {
  if (s === 'APPROVED') return 'green'
  if (s === 'REJECTED') return 'red'
  if (s === 'PENDING') return 'amber'
  return 'slate'
}

function isoToDateTimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

function toIsoOrNull(dateTimeLocal) {
  if (!dateTimeLocal) return null
  const d = new Date(dateTimeLocal)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function CollaborationPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { projectId } = useProject()
  const { user } = useAuth()

  const isClient = user?.role === 'CLIENT'
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState('discussion')

  const [msgDraft, setMsgDraft] = useState({
    visibility: 'CLIENT_VISIBLE',
    message: '',
    markerLat: '',
    markerLon: '',
  })

  const [approvalDraft, setApprovalDraft] = useState({
    scope: 'CLIENT',
    targetType: 'DOCUMENT',
    targetId: '',
    requestNote: '',
  })

  const [meetingDraft, setMeetingDraft] = useState({
    title: '',
    scheduledAt: '',
    location: '',
    agenda: '',
  })

  const [editingMeeting, setEditingMeeting] = useState(null)
  const [meetingEditDraft, setMeetingEditDraft] = useState({ scheduledAt: '', location: '', agenda: '', minutes: '' })

  const [decision, setDecision] = useState(null) // { approval, status }
  const [decisionComment, setDecisionComment] = useState('')

  const messagesQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-messages', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/messages`)).data,
  })

  const approvalsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-approvals', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/approvals`)).data,
  })

  const meetingsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-meetings', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/meetings`)).data,
  })

  const documentsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['project-docs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/documents`)).data,
  })

  const runsQuery = useQuery({
    enabled: !!projectId,
    queryKey: ['subdivision-runs', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/subdivisions`)).data,
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/api/notifications')).data,
  })

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])
  const approvals = useMemo(() => approvalsQuery.data ?? [], [approvalsQuery.data])
  const meetings = useMemo(() => meetingsQuery.data ?? [], [meetingsQuery.data])
  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data])
  const runs = useMemo(() => runsQuery.data ?? [], [runsQuery.data])
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data])
  const unreadCount = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications])

  useEffect(() => {
    if (tab === 'notifications') {
      notificationsQuery.refetch()
    }
  }, [tab])

  const createMessageMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        visibility: msgDraft.visibility,
        message: msgDraft.message,
        markerLat: msgDraft.markerLat === '' ? null : Number(msgDraft.markerLat),
        markerLon: msgDraft.markerLon === '' ? null : Number(msgDraft.markerLon),
      }
      return (await api.post(`/api/projects/${projectId}/messages`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-messages', projectId] })
      toast.success('Posted', 'Message added to the workspace.')
      setMsgDraft((p) => ({ ...p, message: '', markerLat: '', markerLon: '' }))
    },
    onError: (e) => toast.error('Post failed', e?.response?.data?.message || 'Unable to post message.'),
  })

  const requestApprovalMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        scope: approvalDraft.scope,
        targetType: approvalDraft.targetType,
        targetId: approvalDraft.targetId,
        requestNote: approvalDraft.requestNote || null,
      }
      return (await api.post(`/api/projects/${projectId}/approvals`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-approvals', projectId] })
      await qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Requested', 'Approval request created.')
      setApprovalDraft({ scope: 'CLIENT', targetType: 'DOCUMENT', targetId: '', requestNote: '' })
    },
    onError: (e) => toast.error('Request failed', e?.response?.data?.message || 'Unable to request approval.'),
  })

  const decideApprovalMutation = useMutation({
    mutationFn: async ({ approvalId, status, decisionComment }) => {
      return (
        await api.post(`/api/projects/${projectId}/approvals/${approvalId}/decide`, {
          status,
          decisionComment: decisionComment || null,
        })
      ).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-approvals', projectId] })
      await qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Saved', 'Decision recorded.')
      setDecision(null)
      setDecisionComment('')
    },
    onError: (e) => toast.error('Decision failed', e?.response?.data?.message || 'Unable to submit decision.'),
  })

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: meetingDraft.title,
        scheduledAt: toIsoOrNull(meetingDraft.scheduledAt),
        location: meetingDraft.location || null,
        agenda: meetingDraft.agenda || null,
      }
      return (await api.post(`/api/projects/${projectId}/meetings`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-meetings', projectId] })
      await qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Scheduled', 'Meeting created.')
      setMeetingDraft({ title: '', scheduledAt: '', location: '', agenda: '' })
    },
    onError: (e) => toast.error('Create failed', e?.response?.data?.message || 'Unable to create meeting.'),
  })

  const updateMeetingMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        scheduledAt: toIsoOrNull(meetingEditDraft.scheduledAt),
        location: meetingEditDraft.location || null,
        agenda: meetingEditDraft.agenda || null,
        minutes: meetingEditDraft.minutes || null,
      }
      return (await api.put(`/api/projects/${projectId}/meetings/${editingMeeting.id}`, payload)).data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-meetings', projectId] })
      toast.success('Updated', 'Meeting updated.')
      setEditingMeeting(null)
    },
    onError: (e) => toast.error('Update failed', e?.response?.data?.message || 'Unable to update meeting.'),
  })

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await api.post(`/api/notifications/${notificationId}/read`)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: () => toast.error('Update failed', 'Unable to mark notification as read.'),
  })

  async function useGpsMarker() {
    if (!navigator.geolocation) {
      toast.error('GPS unavailable', 'This browser/device does not support geolocation.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMsgDraft((p) => ({ ...p, markerLat: String(pos.coords.latitude), markerLon: String(pos.coords.longitude) }))
        toast.success('Marker added', 'GPS marker added to the message.')
      },
      (err) => toast.error('GPS error', err?.message || 'Unable to fetch current location.'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="p-6">
          <div className="text-lg font-semibold text-slate-900">Select a project</div>
          <p className="mt-2 text-sm text-slate-600">Choose an Active Project to collaborate with stakeholders.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Collaboration & Stakeholder Portal</h1>
          <p className="mt-1 text-sm text-slate-600">Commenting, approvals, meetings, and notifications per project.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={tab === 'discussion' ? 'secondary' : 'outline'} onClick={() => setTab('discussion')}>
            Discussion
          </Button>
          <Button variant={tab === 'approvals' ? 'secondary' : 'outline'} onClick={() => setTab('approvals')}>
            Approvals
          </Button>
          <Button variant={tab === 'meetings' ? 'secondary' : 'outline'} onClick={() => setTab('meetings')}>
            Meetings
          </Button>
          <Button variant={tab === 'notifications' ? 'secondary' : 'outline'} onClick={() => setTab('notifications')}>
            Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Button>
        </div>
      </div>

      {tab === 'discussion' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Post a message</div>
                <div className="mt-1 text-sm text-slate-600">Optional GPS marker acts as a lightweight map markup.</div>
              </div>
              <Button variant="outline" size="sm" onClick={useGpsMarker}>
                Use GPS
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Visibility</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={msgDraft.visibility}
                  onChange={(e) => setMsgDraft((p) => ({ ...p, visibility: e.target.value }))}
                  disabled={isClient}
                >
                  <option value="CLIENT_VISIBLE">CLIENT_VISIBLE</option>
                  {!isClient ? <option value="INTERNAL">INTERNAL</option> : null}
                </select>
                {isClient ? <div className="mt-1 text-xs text-slate-500">Client messages are always client-visible.</div> : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Marker latitude</label>
                  <Input
                    value={msgDraft.markerLat}
                    onChange={(e) => setMsgDraft((p) => ({ ...p, markerLat: e.target.value }))}
                    placeholder="(optional)"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Marker longitude</label>
                  <Input
                    value={msgDraft.markerLon}
                    onChange={(e) => setMsgDraft((p) => ({ ...p, markerLon: e.target.value }))}
                    placeholder="(optional)"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Message</label>
                <textarea
                  className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={msgDraft.message}
                  onChange={(e) => setMsgDraft((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Write your comment..."
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={!msgDraft.message.trim() || createMessageMutation.isPending}
                  onClick={() => createMessageMutation.mutate()}
                >
                  {createMessageMutation.isPending ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Workspace feed</div>
                <div className="mt-1 text-sm text-slate-600">Comments and updates for this project.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => messagesQuery.refetch()} disabled={messagesQuery.isFetching}>
                Refresh
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {messagesQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
              {messagesQuery.isError ? <div className="text-sm text-rose-600">Failed to load messages.</div> : null}
              {!messagesQuery.isLoading && messages.length === 0 ? <div className="text-sm text-slate-600">No messages yet.</div> : null}
              {messages.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{m.actorUsername || 'System'}</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.message}</div>
                      {m.markerLat != null && m.markerLon != null ? (
                        <div className="mt-2 text-xs text-slate-600">
                          Marker: {Number(m.markerLat).toFixed(6)}, {Number(m.markerLon).toFixed(6)}
                        </div>
                      ) : null}
                      <div className="mt-2 text-xs text-slate-500">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                    </div>
                    <Badge tone={toneVisibility(m.visibility)}>{m.visibility}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'approvals' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="text-sm font-semibold text-slate-900">Request an approval</div>
            <div className="mt-1 text-sm text-slate-600">Submit documents or subdivision results for client/authority review.</div>

            {isClient ? (
              <div className="mt-4 text-sm text-slate-600">Client view: you can review and decide pending client approvals.</div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Scope</label>
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={approvalDraft.scope}
                      onChange={(e) => setApprovalDraft((p) => ({ ...p, scope: e.target.value }))}
                    >
                      <option value="CLIENT">CLIENT</option>
                      <option value="AUTHORITY">AUTHORITY</option>
                    </select>
                    {!isAdmin && approvalDraft.scope === 'AUTHORITY' ? (
                      <div className="mt-1 text-xs text-slate-500">Authority decisions are handled by admins.</div>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Target type</label>
                    <select
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={approvalDraft.targetType}
                      onChange={(e) => setApprovalDraft((p) => ({ ...p, targetType: e.target.value, targetId: '' }))}
                    >
                      <option value="DOCUMENT">DOCUMENT</option>
                      <option value="SUBDIVISION_RUN">SUBDIVISION_RUN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Target</label>
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={approvalDraft.targetId}
                    onChange={(e) => setApprovalDraft((p) => ({ ...p, targetId: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {approvalDraft.targetType === 'DOCUMENT'
                      ? documents.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.docType})
                          </option>
                        ))
                      : runs.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.id.slice(0, 8)} - parcels {r.targetParcels} ({r.status})
                          </option>
                        ))}
                  </select>
                  {approvalDraft.targetType === 'SUBDIVISION_RUN' && runs.length === 0 ? (
                    <div className="mt-1 text-xs text-slate-500">Run subdivision first.</div>
                  ) : null}
                  {approvalDraft.targetType === 'DOCUMENT' && documents.length === 0 ? (
                    <div className="mt-1 text-xs text-slate-500">Upload project documents first.</div>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Note (optional)</label>
                  <textarea
                    className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={approvalDraft.requestNote}
                    onChange={(e) => setApprovalDraft((p) => ({ ...p, requestNote: e.target.value }))}
                    placeholder="Context for reviewers..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button disabled={!approvalDraft.targetId || requestApprovalMutation.isPending} onClick={() => requestApprovalMutation.mutate()}>
                    {requestApprovalMutation.isPending ? 'Submitting...' : 'Request approval'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Approvals</div>
                <div className="mt-1 text-sm text-slate-600">Track decisions and pending reviews.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => approvalsQuery.refetch()} disabled={approvalsQuery.isFetching}>
                Refresh
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {approvalsQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
              {approvalsQuery.isError ? <div className="text-sm text-rose-600">Failed to load approvals.</div> : null}
              {!approvalsQuery.isLoading && approvals.length === 0 ? <div className="text-sm text-slate-600">No approvals yet.</div> : null}

              {approvals.map((a) => {
                const canDecide =
                  a.status === 'PENDING' && ((a.scope === 'CLIENT' && isClient) || (a.scope === 'AUTHORITY' && isAdmin))

                return (
                  <div key={a.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {a.scope} - {a.targetType}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Target: {String(a.targetId).slice(0, 8)}</div>
                        {a.requestNote ? <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.requestNote}</div> : null}
                        <div className="mt-2 text-xs text-slate-500">
                          Requested by {a.requestedByUsername || '-'} - {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                        </div>
                        {a.decidedAt ? (
                          <div className="mt-1 text-xs text-slate-500">
                            Decided by {a.decidedByUsername || '-'} - {new Date(a.decidedAt).toLocaleString()}
                          </div>
                        ) : null}
                        {a.decisionComment ? (
                          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {a.decisionComment}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge tone={toneApprovalStatus(a.status)}>{a.status}</Badge>
                        {canDecide ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDecision({ approval: a, status: 'APPROVED' })
                                setDecisionComment('')
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setDecision({ approval: a, status: 'REJECTED' })
                                setDecisionComment('')
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'meetings' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="text-sm font-semibold text-slate-900">Schedule a meeting</div>
            <div className="mt-1 text-sm text-slate-600">Create meetings and log minutes for the project.</div>

            {isClient ? (
              <div className="mt-4 text-sm text-slate-600">Client view: meetings are read-only.</div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <Input value={meetingDraft.title} onChange={(e) => setMeetingDraft((p) => ({ ...p, title: e.target.value }))} placeholder="e.g., Site visit briefing" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Scheduled at</label>
                  <Input type="datetime-local" value={meetingDraft.scheduledAt} onChange={(e) => setMeetingDraft((p) => ({ ...p, scheduledAt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Location</label>
                  <Input value={meetingDraft.location} onChange={(e) => setMeetingDraft((p) => ({ ...p, location: e.target.value }))} placeholder="(optional)" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Agenda</label>
                  <textarea
                    className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={meetingDraft.agenda}
                    onChange={(e) => setMeetingDraft((p) => ({ ...p, agenda: e.target.value }))}
                    placeholder="Agenda..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button disabled={!meetingDraft.title.trim() || !meetingDraft.scheduledAt || createMeetingMutation.isPending} onClick={() => createMeetingMutation.mutate()}>
                    {createMeetingMutation.isPending ? 'Creating...' : 'Create meeting'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Meetings</div>
                <div className="mt-1 text-sm text-slate-600">Schedule history and minutes.</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => meetingsQuery.refetch()} disabled={meetingsQuery.isFetching}>
                Refresh
              </Button>
            </div>

            <div className="mt-4 space-y-2">
              {meetingsQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
              {meetingsQuery.isError ? <div className="text-sm text-rose-600">Failed to load meetings.</div> : null}
              {!meetingsQuery.isLoading && meetings.length === 0 ? <div className="text-sm text-slate-600">No meetings yet.</div> : null}

              {meetings.map((m) => (
                <div key={m.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{m.title}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : ''}
                        {m.location ? ` - ${m.location}` : ''}
                      </div>
                      {m.agenda ? <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.agenda}</div> : null}
                      {m.minutes ? (
                        <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minutes</div>
                          <div className="mt-1">{m.minutes}</div>
                        </div>
                      ) : null}
                      <div className="mt-2 text-xs text-slate-500">{m.createdByUsername ? `By ${m.createdByUsername}` : ''}</div>
                    </div>

                    {!isClient ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMeeting(m)
                          setMeetingEditDraft({
                            scheduledAt: isoToDateTimeLocal(m.scheduledAt),
                            location: m.location || '',
                            agenda: m.agenda || '',
                            minutes: m.minutes || '',
                          })
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'notifications' ? (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Notification center</div>
              <div className="mt-1 text-sm text-slate-600">Updates from approvals and meetings.</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => notificationsQuery.refetch()} disabled={notificationsQuery.isFetching}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {notificationsQuery.isLoading ? <div className="text-sm text-slate-600">Loading...</div> : null}
            {notificationsQuery.isError ? <div className="text-sm text-rose-600">Failed to load notifications.</div> : null}
            {!notificationsQuery.isLoading && notifications.length === 0 ? <div className="text-sm text-slate-600">No notifications yet.</div> : null}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={[
                  'rounded-xl border px-3 py-3',
                  n.readAt ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{n.type}</div>
                    <div className="mt-1 text-sm text-slate-900">{n.message}</div>
                    <div className="mt-1 text-xs text-slate-500">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
                  </div>
                  {!n.readAt ? (
                    <Button size="sm" variant="outline" onClick={() => markReadMutation.mutate(n.id)}>
                      Mark read
                    </Button>
                  ) : (
                    <Badge tone="slate">Read</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Modal
        open={!!editingMeeting}
        title={editingMeeting ? `Edit meeting: ${editingMeeting.title}` : 'Edit meeting'}
        onClose={() => setEditingMeeting(null)}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Scheduled at</label>
            <Input
              type="datetime-local"
              value={meetingEditDraft.scheduledAt}
              onChange={(e) => setMeetingEditDraft((p) => ({ ...p, scheduledAt: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Location</label>
            <Input
              value={meetingEditDraft.location}
              onChange={(e) => setMeetingEditDraft((p) => ({ ...p, location: e.target.value }))}
              placeholder="(optional)"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Agenda</label>
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={meetingEditDraft.agenda}
              onChange={(e) => setMeetingEditDraft((p) => ({ ...p, agenda: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Minutes</label>
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={meetingEditDraft.minutes}
              onChange={(e) => setMeetingEditDraft((p) => ({ ...p, minutes: e.target.value }))}
              placeholder="Meeting minutes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingMeeting(null)}>
              Cancel
            </Button>
            <Button disabled={!meetingEditDraft.scheduledAt || updateMeetingMutation.isPending} onClick={() => updateMeetingMutation.mutate()}>
              {updateMeetingMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!decision}
        title={decision ? `${decision.status === 'APPROVED' ? 'Approve' : 'Reject'} approval` : 'Decision'}
        onClose={() => setDecision(null)}
      >
        <div className="space-y-3">
          {decision ? (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {decision.approval.scope} - {decision.approval.targetType} - {String(decision.approval.targetId).slice(0, 8)}
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium text-slate-700">Comment (optional)</label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              placeholder="Decision notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision?.status === 'REJECTED' ? 'danger' : 'secondary'}
              disabled={decideApprovalMutation.isPending}
              onClick={() =>
                decideApprovalMutation.mutate({
                  approvalId: decision.approval.id,
                  status: decision.status,
                  decisionComment,
                })
              }
            >
              {decideApprovalMutation.isPending ? 'Saving...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

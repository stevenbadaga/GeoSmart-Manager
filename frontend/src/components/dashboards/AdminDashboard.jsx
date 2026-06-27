import React from 'react'
import { useNavigate } from 'react-router-dom'
import MiniMap from '../MiniMap'

const Icon = ({ type }) => {
  const common = {
    className: 'h-5 w-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.9',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true'
  }

  const icons = {
    users: <svg {...common}><path d="M8 19c0-2.5 1.9-4.3 4-4.3s4 1.8 4 4.3" /><circle cx="12" cy="8.5" r="3" /><path d="M4.5 18c.1-1.8 1.2-3.2 2.8-3.8M19.5 18c-.1-1.8-1.2-3.2-2.8-3.8" /></svg>,
    briefcase: <svg {...common}><path d="M4 7.5h16v10.8a2 2 0 01-2 2H6a2 2 0 01-2-2z" /><path d="M9 7.5V5.8a2 2 0 012-2h2a2 2 0 012 2v1.7M4 12.5h16" /></svg>,
    review: <svg {...common}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4M8.5 11.5l1.8 1.8 3.6-4.2" /></svg>,
    mail: <svg {...common}><rect x="3.5" y="5.5" width="17" height="13" rx="2.2" /><path d="M4.5 7l7.5 5.5L19.5 7" /></svg>,
    layers: <svg {...common}><path d="M12 3.5l8 4.2-8 4.2-8-4.2z" /><path d="M4 12l8 4.2 8-4.2M4 16.5l8 4.2 8-4.2" /></svg>,
    audit: <svg {...common}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" /></svg>,
    activity: <svg {...common}><path d="M4 12h4l2-6 4 12 2-6h4" /></svg>,
    arrow: <svg {...common}><path d="M7 17L17 7M8 7h9v9" /></svg>
  }

  return icons[type] || icons.activity
}

export default function AdminDashboard({ metrics, loading, loadedLayers, layerStatus, readinessScore, formatNumber, layerLabel }) {
  const navigate = useNavigate()
  const readiness = Number.isFinite(readinessScore) ? readinessScore : 0
  const totalLayerCount = layerStatus.length
  const offlineLayers = Math.max(totalLayerCount - loadedLayers.length, 0)
  const latestActivities = metrics?.latestActivities || []

  const metricItems = [
    { label: 'Total Users', value: metrics?.totalUsers, detail: `${metrics?.totalClients ?? 0} Clients, ${metrics?.totalSurveyors ?? 0} Surveyors`, icon: 'users' },
    { label: 'Total Projects', value: metrics?.totalProjects, detail: `${metrics?.projectsPendingAssignment ?? 0} pending assignment`, icon: 'briefcase' },
    { label: 'Active Reviews', value: metrics?.projectsUnderReview, detail: `${metrics?.projectsSubdivisionReview ?? 0} in subdivision`, icon: 'review' },
    { label: 'Reports & Inquiries', value: metrics?.plannerReportTotal, detail: `${metrics?.newContactMessages ?? 0} new messages`, icon: 'mail' },
    { label: 'Data Readiness', value: `${readiness}%`, detail: `${loadedLayers.length} layers active`, icon: 'layers' }
  ]

  const operations = [
    { title: 'User Directory', detail: 'Manage identity and access', icon: 'users', route: '/users' },
    { title: 'Project Hub', detail: 'Oversee active planning cases', icon: 'briefcase', route: '/projects' },
    { title: 'Public Inquiries', detail: 'Review contact messages', icon: 'mail', route: '/contact-messages' },
    { title: 'Audit Logs', detail: 'Trace system activity', icon: 'audit', route: '/audit' }
  ]

  const layerKeys = ['PARCELS', 'ZONING', 'BUILDING_FOOTPRINTS', 'CONSTRAINTS']

  return (
    <div className="admin-overview animate-rise">
      <section className="admin-hero-panel">
        <div className="admin-hero-copy">
          <span className="admin-kicker">ADMIN OVERVIEW</span>
          <h2>Operational Control Center</h2>
          <p>Monitor users, planning cases, GIS readiness, reports, and recent platform activity from one live workspace.</p>
        </div>
        <div className="admin-hero-grid">
          <div className="admin-readiness-ring" style={{ '--readiness': `${readiness * 3.6}deg` }}>
            <span>{readiness}%</span>
            <small>Readiness</small>
          </div>
          <div className="admin-hero-micro">
            <span>{formatNumber(loadedLayers.length)}</span>
            <small>active layers</small>
          </div>
          <div className="admin-hero-micro admin-hero-micro-warm">
            <span>{formatNumber(latestActivities.length)}</span>
            <small>recent events</small>
          </div>
        </div>
      </section>

      <section className="admin-metric-grid" aria-label="Admin metrics">
        {metricItems.map((item) => (
          <article key={item.label} className="admin-stat-card">
            <div className="admin-card-topline">
              <span className="admin-icon-box"><Icon type={item.icon} /></span>
              <span className="admin-card-line" />
            </div>
            <p className="admin-stat-label">{item.label}</p>
            <p className="admin-stat-value">{item.value ?? (loading ? '...' : '--')}</p>
            <p className="admin-stat-detail">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="admin-content-grid">
        <div className="admin-main-column">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <span className="admin-kicker">SYSTEM OPERATIONS</span>
                <h3>Quick Actions</h3>
              </div>
            </div>
            <div className="admin-operation-grid">
              {operations.map((item) => (
                <button key={item.title} type="button" onClick={() => navigate(item.route)} className="admin-action-card">
                  <span className="admin-icon-box admin-icon-box-soft"><Icon type={item.icon} /></span>
                  <span className="admin-action-copy">
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span className="admin-action-arrow"><Icon type="arrow" /></span>
                </button>
              ))}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <span className="admin-kicker">GIS DATA OVERVIEW</span>
                <h3>Critical Layers</h3>
              </div>
              <span className="admin-soft-badge">{loadedLayers.length}/{totalLayerCount || 0} online</span>
            </div>
            <div className="admin-layer-grid">
              {layerKeys.map((key) => {
                const layer = layerStatus.find((item) => item.layerKey === key) || { layerKey: key, loadedSuccessfully: false, featureCount: 0 }
                return (
                  <div key={key} className="admin-layer-card">
                    <div>
                      <p>{layerLabel(key)}</p>
                      <strong>{formatNumber(layer.featureCount)}</strong>
                    </div>
                    <span className={`admin-layer-status ${layer.loadedSuccessfully ? 'is-ready' : 'is-offline'}`}>
                      {layer.loadedSuccessfully ? 'Ready' : 'Offline'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="admin-side-column">
          <div className="admin-panel admin-health-panel">
            <div className="admin-panel-header">
              <div>
                <span className="admin-kicker">SYSTEM HEALTH</span>
                <h3>Data Coverage</h3>
              </div>
            </div>
            <div className="admin-health-body">
              <div className="admin-readiness-ring admin-readiness-ring-large" style={{ '--readiness': `${readiness * 3.6}deg` }}>
                <span>{readiness}%</span>
                <small>GIS ready</small>
              </div>
              <div className="admin-health-list">
                <div><span>Loaded layers</span><strong>{formatNumber(loadedLayers.length)}</strong></div>
                <div><span>Offline layers</span><strong>{formatNumber(offlineLayers)}</strong></div>
                <div><span>New messages</span><strong>{formatNumber(metrics?.newContactMessages ?? 0)}</strong></div>
              </div>
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <span className="admin-kicker">LATEST ACTIVITY</span>
                <h3>System Timeline</h3>
              </div>
            </div>
            <div className="admin-timeline">
              {latestActivities.length > 0 ? (
                latestActivities.map((act, index) => (
                  <div key={`${act.timestamp}-${index}`} className="admin-timeline-item">
                    <span className="admin-timeline-dot" />
                    <p>{act.description}</p>
                    <time>{new Date(act.timestamp).toLocaleString()}</time>
                  </div>
                ))
              ) : (
                <div className="admin-empty-state">
                  <Icon type="activity" />
                  <p>No recent system activity recorded.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="admin-map-panel">
        <MiniMap />
        <div className="admin-map-chip">
          <span />
          Kigali GIS operational view
        </div>
      </section>
    </div>
  )
}

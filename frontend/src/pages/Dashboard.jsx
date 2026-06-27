import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { api } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import AdminDashboard from '../components/dashboards/AdminDashboard'
import SurveyorDashboard from '../components/dashboards/SurveyorDashboard'
import ClientDashboard from '../components/dashboards/ClientDashboard'

function formatNumber(value) {
  if (!Number.isFinite(value)) return '0'
  return Math.round(value).toLocaleString()
}

function statusTone(loaded) {
  return loaded ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
}

function layerLabel(layerKey) {
  return layerKey
    ?.replaceAll('_', ' ')
    ?.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'GIS Layer'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [layerStatus, setLayerStatus] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')
      try {
        const [layers, metricData] = await Promise.all([
          api.get('/api/layers/status'),
          api.get('/api/metrics/overview').catch(() => null)
        ])
        if (!active) return
        setLayerStatus(Array.isArray(layers) ? layers : [])
        setMetrics(metricData)
        setLastUpdated(new Date())
      } catch (err) {
        if (!active) return
        setError(err.message || 'Unable to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      active = false
    }
  }, [])

  const loadedLayers = useMemo(
    () => layerStatus.filter((layer) => layer.loadedSuccessfully),
    [layerStatus]
  )

  const readinessScore = layerStatus.length
    ? Math.round((loadedLayers.length / layerStatus.length) * 100)
    : 0

  const role = user?.role || 'CLIENT'
  const dashboardProps = { metrics, loading, loadedLayers, layerStatus, readinessScore, formatNumber, statusTone, layerLabel }

  return (
    <div className="space-y-6 pb-10">
      {role === 'ADMIN' && <AdminDashboard {...dashboardProps} />}
      {role === 'SURVEYOR' && <SurveyorDashboard {...dashboardProps} />}
      {role === 'CLIENT' && <ClientDashboard {...dashboardProps} />}
      
      {error && <Card className="border border-danger/30 bg-danger/5 text-sm text-danger mt-4">{error}</Card>}
      
      <div className="pt-10 border-t border-slate-100 flex flex-col items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/20">System Governance</p>
        <p className="text-[10px] text-ink/35 text-center max-w-2xl leading-relaxed">
          Operational metrics and GIS readiness are synchronized with the Kigali Land Planning Engine. 
          Last refreshed: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'connecting...'}
        </p>
      </div>
    </div>
  )
}

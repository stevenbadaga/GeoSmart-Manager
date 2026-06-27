import React from 'react'
import Card from '../Card'
import Button from '../Button'
import { useNavigate } from 'react-router-dom'
import MiniMap from '../MiniMap'

export default function SurveyorDashboard({ metrics, loading, loadedLayers, formatNumber, statusTone, layerLabel }) {
  const navigate = useNavigate()

  const metricItems = [
    { label: 'Assigned Projects', value: metrics?.assignedProjects, detail: `${metrics?.pendingReviews ?? 0} pending review`, icon: 'briefcase', color: 'emerald' },
    { label: 'Subdivision Reviews', value: metrics?.activeSubdivisionReviews, detail: 'Active in AI Planner', icon: 'search', color: 'blue' },
    { label: 'Reports Generated', value: metrics?.surveyorReportsGenerated, detail: `${metrics?.reportsThisMonth ?? 0} this month`, icon: 'chart', color: 'purple' },
    { label: 'GIS Readiness', value: loadedLayers.length, detail: 'Operational layers', icon: 'layers', color: 'amber' }
  ]

  const dashboardIcons = {
    briefcase: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>,
    search: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>,
    chart: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>,
    layers: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
  }

  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100'
  }

  return (
    <div className="space-y-10 animate-rise">
      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricItems.map((item) => (
          <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-premium transition-all hover:border-emerald-500/20 hover:shadow-lg">
            <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border ${colorMap[item.color]}`}>
              {dashboardIcons[item.icon]}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 font-display">{item.value ?? '--'}</p>
            <p className="mt-2 text-[11px] font-bold text-slate-500/70">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <Card title="Technical Workspace" premium className="shadow-premium">
             <div className="grid gap-5 sm:grid-cols-2">
                <button onClick={() => navigate('/subdivision')} className="group relative overflow-hidden rounded-[2rem] bg-[#063F35] p-8 text-white text-left transition-all hover:shadow-2xl hover:-translate-y-1">
                   <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl group-hover:bg-emerald-400/20 transition-all" />
                   <div className="relative z-10">
                     <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Core Engine</p>
                     <h3 className="mt-4 text-2xl font-bold tracking-tight font-display">AI Subdivision</h3>
                     <p className="mt-3 text-sm text-emerald-100/70 leading-relaxed font-medium">Run zoning audits, building conflict checks, and synthesize layout proposals for Kigali.</p>
                     <div className="mt-8 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-emerald-400">
                        Launch Planner
                        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                     </div>
                   </div>
                </button>
                <div className="grid gap-4">
                  <button onClick={() => navigate('/map')} className="group flex items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-left transition-all hover:border-emerald-200 hover:bg-white hover:shadow-lg">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110">
                       <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">GIS Workspace</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">Kigali layer inspection</p>
                    </div>
                  </button>
                  <button onClick={() => navigate('/projects')} className="group flex items-center gap-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-left transition-all hover:border-emerald-200 hover:bg-white hover:shadow-lg">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                       <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Case Directory</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">Manage active project queue</p>
                    </div>
                  </button>
                </div>
             </div>
          </Card>

          <Card title="Technical Audit Queue" className="shadow-premium">
             <div className="p-12 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400 mb-6 shadow-sm">
                   <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" /></svg>
                </div>
                <h4 className="text-lg font-bold text-slate-900">No projects currently under review</h4>
                <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">Select a project from your assignments to begin the subdivision compliance audit.</p>
                <Button variant="secondary" className="mt-8 text-xs px-8" onClick={() => navigate('/projects')}>Open Assignments</Button>
             </div>
          </Card>
        </div>

        <div className="space-y-8">
           <Card title="Planning Workflow" premium className="shadow-premium">
              <div className="space-y-6 relative ml-4 before:absolute before:left-[-12px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                 {[
                   { t: 'UPI Validation', d: 'Verify parcel identity & status' },
                   { t: 'Zoning Audit', d: 'Compliance with masterplan rules' },
                   { t: 'Constraint Map', d: 'Slope, wetland & road buffers' },
                   { t: 'Synthesize Plots', d: 'Generate subdivision layout' },
                   { t: 'Export PDF', d: 'Issue professional planning dossier' }
                 ].map((s, i) => (
                   <div key={i} className="relative group">
                      <span className="absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-[6px] ring-white transition-transform group-hover:scale-125 shadow-sm" />
                      <div className="pl-5">
                        <p className="text-[13px] font-bold text-slate-800 leading-none">{s.t}</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-2">{s.d}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </Card>

           <Card title="Official References" className="shadow-premium bg-[#002a23] text-white border-none overflow-hidden relative group">
              <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:scale-125 transition-transform" />
              <ul className="space-y-4 relative z-10">
                 {[
                   'Kigali Masterplan Regulations',
                   'Land Law & Ownership Standards',
                   'Subdivision Minimum Area Matrix',
                   'Environmental Buffer Guidelines'
                 ].map((ref) => (
                   <li key={ref} className="flex items-center gap-3 text-[11px] font-bold text-emerald-100/60 hover:text-emerald-300 transition-colors cursor-pointer group">
                      <div className="h-1 w-2 rounded-full bg-emerald-500 transition-all group-hover:w-4" />
                      {ref}
                   </li>
                 ))}
              </ul>
           </Card>

           <Card title="Kigali Map Snapshot" className="p-0 overflow-hidden shadow-premium group">
             <div className="h-[300px] relative">
                <MiniMap />
                <div className="absolute bottom-5 left-5 z-[1000] rounded-2xl bg-slate-900/90 border border-white/10 px-4 py-2.5 text-[10px] font-bold text-white shadow-2xl backdrop-blur-md group-hover:translate-y-[-2px] transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    GIS Engine Operational
                  </div>
                </div>
             </div>
           </Card>
        </div>
      </div>
    </div>
  )
}

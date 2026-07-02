import React from 'react'
import Card from '../Card'
import { useNavigate } from 'react-router-dom'
import MiniMap from '../MiniMap'

export default function ClientDashboard({ metrics, loading }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-10 animate-rise">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-[#063F35] p-12 lg:p-16 text-white shadow-2xl">
         <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
         <div className="gis-grid absolute inset-0 opacity-[0.03]" />
         <div className="relative z-10 lg:flex items-center justify-between gap-20">
            <div className="max-w-3xl">
               <div className="inline-flex items-center gap-3 rounded-full bg-emerald-400/10 px-4 py-2 border border-emerald-400/20 mb-8 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Client Portal</p>
               </div>
               <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05] font-display">Track your land planning progress</h1>
               <p className="mt-8 text-lg lg:text-xl text-emerald-100/70 leading-relaxed font-medium">Monitor case status, download professional GIS compliance reports, and manage documentation in your private professional workspace.</p>
               <div className="mt-12 flex flex-wrap gap-6">
                  <button onClick={() => navigate('/projects')} className="group flex items-center gap-3 rounded-xl bg-white px-10 py-4 font-black text-[#063F35] transition-all hover:bg-emerald-50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 shadow-lg">
                    My Projects
                    <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                  <button onClick={() => navigate('/reports')} className="rounded-xl border border-white/20 bg-white/5 px-10 py-4 font-black text-white transition-all hover:bg-white/10 hover:border-white/30 backdrop-blur-sm">
                    View Reports
                  </button>
               </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-6 shrink-0">
               <div className="p-8 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl text-center min-w-[180px] transition-transform hover:-translate-y-1">
                  <p className="text-4xl font-bold tracking-tight font-display">{metrics?.myProjectsCount ?? '--'}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/60 mt-4">Active Cases</p>
               </div>
               <div className="p-8 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl text-center min-w-[180px] transition-transform hover:-translate-y-1">
                  <p className="text-4xl font-bold tracking-tight font-display">{metrics?.myReportsCount ?? '--'}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/60 mt-4">Ready Reports</p>
               </div>
            </div>
         </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
         <div className="space-y-10">
            <Card title="Active Case Monitoring" premium className="shadow-premium">
               <div className="p-12 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 transition-all hover:bg-white hover:border-emerald-200 group">
                  <div className="mx-auto grid h-20 w-16 place-items-center rounded-xl bg-white text-emerald-600 mb-10 shadow-xl shadow-emerald-900/5 group-hover:scale-110 transition-transform">
                     <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-display">Manage your planning projects</h3>
                  <p className="mt-4 text-slate-500 max-w-sm mx-auto text-base leading-relaxed font-medium">Access detailed progress, surveyor updates, and technical status for your parcels in the projects module.</p>
                  <button onClick={() => navigate('/projects')} className="mt-10 inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-800 transition-colors">
                    Open Project Directory
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
               </div>
            </Card>

            <div className="grid gap-6 sm:grid-cols-2">
               <Card className="p-8 shadow-premium group hover:border-emerald-300 transition-all hover:-translate-y-1 active:scale-[0.98]">
                  <div className="flex items-center gap-6">
                     <div className="h-14 w-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 7h16v11H4z" /><path d="M9 7V5h6v2" /></svg>
                     </div>
                     <div>
                        <p className="font-bold text-slate-900 leading-tight">Project Documents</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-2 uppercase tracking-wider">Manage titles & ID files</p>
                     </div>
                  </div>
               </Card>
               <Card className="p-8 shadow-premium group hover:border-emerald-300 transition-all hover:-translate-y-1 active:scale-[0.98]">
                  <div className="flex items-center gap-6">
                     <div className="h-14 w-14 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6l7-3z" /></svg>
                     </div>
                     <div>
                        <p className="font-bold text-slate-900 leading-tight">Compliance Reports</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-2 uppercase tracking-wider">Official planning dossiers</p>
                     </div>
                  </div>
               </Card>
            </div>
         </div>

         <div className="space-y-10">
            <Card title="Portal Notifications" premium className="shadow-premium">
               <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-100 text-[13px] font-bold text-emerald-800 flex gap-4 leading-relaxed shadow-sm">
                     <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                     Welcome to your GeoSmart workspace. Active projects will be displayed here as they are registered and assigned.
                  </div>
                  <button onClick={() => navigate('/notifications')} className="w-full text-center py-4 rounded-xl border border-slate-100 bg-slate-50/50 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-[0.98]">
                    View All Signal Logs
                  </button>
               </div>
            </Card>

            <Card title="Planning Roadmap" className="shadow-premium">
               <div className="space-y-8 relative ml-4 before:absolute before:left-[-12px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                  {[
                    { t: 'Project Submission', d: 'Define your land planning case' },
                    { t: 'GIS Review Phase', d: 'Technical audit of parcel layers' },
                    { t: 'AI Subdivision', d: 'Optimized layout generation' },
                    { t: 'Final Dossier', d: 'Official compliance report ready' }
                  ].map((s, i) => (
                    <div key={i} className="relative group">
                       <span className="absolute left-[-16px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-[6px] ring-white transition-transform group-hover:scale-125 shadow-sm" />
                       <div className="pl-6">
                          <p className="text-[13px] font-bold text-slate-800 leading-none group-hover:text-emerald-700 transition-colors">{s.t}</p>
                          <p className="text-[11px] font-medium text-slate-400 mt-2.5">{s.d}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>

            <Card title="GIS Operational View" className="p-0 overflow-hidden shadow-premium group">
              <div className="h-[280px] relative">
                <MiniMap />
                <div className="absolute bottom-5 left-5 z-[1000] rounded-xl bg-slate-900/90 border border-white/10 px-4 py-2.5 text-[10px] font-bold text-white shadow-2xl backdrop-blur-md group-hover:translate-y-[-2px] transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Kigali GIS Engine Ready
                  </div>
                </div>
              </div>
            </Card>
         </div>
      </div>
    </div>
  )
}

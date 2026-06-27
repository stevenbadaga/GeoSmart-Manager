import React from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { publicImages } from '../assets/publicImages'

export default function Features() {
  return (
    <PublicLayout>
      <div className="space-y-0 antialiased">
        
        {/* HERO & OVERLAPPING CARD WRAPPER */}
        <div className="relative bg-white pb-20">
          {/* PART A — HERO IMAGE (Image-only with soft overlay) */}
          <section className="relative left-1/2 right-1/2 -mt-10 h-[360px] md:h-[440px] lg:h-[520px] w-screen -translate-x-1/2 overflow-hidden bg-slate-950">
            <img
              src={publicImages.sunriseLandscapeImage}
              alt="GeoSmart land planning professional features banner"
              className="absolute inset-0 h-full w-full object-cover brightness-[0.78]"
            />
            <div className="absolute inset-0 bg-slate-950/25" />
          </section>

          {/* PART B & C — OVERLAPPING FEATURES CARD */}
          <section className="relative z-20 -mt-28 md:-mt-36 lg:-mt-44 max-w-7xl mx-auto px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 md:p-12 shadow-2xl text-white">
              <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-10 lg:gap-14 items-start">
                
                {/* Left Column: Features Wording */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    GeoSmart Manager Features
                  </h1>
                  <div className="mt-6 space-y-4 text-base md:text-lg leading-relaxed text-emerald-50">
                    <p>
                      GeoSmart Manager brings together GIS tools, parcel review, subdivision workflow support, document tracking, and reporting features in one organized platform.
                    </p>
                    <p>
                      The system helps users move from parcel search to planning checks and structured outputs while keeping project information, spatial data, and review activities connected.
                    </p>
                    <p>
                      Each feature is designed to support clearer early-stage land planning decisions and improve the organization of subdivision review workflows.
                    </p>
                  </div>
                </div>

                {/* Right Column: Feature Focus */}
                <div className="lg:border-l lg:border-white/25 lg:pl-10">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
                    FEATURE FOCUS
                  </p>
                  <ul className="mt-6 space-y-4">
                    {[
                      'UPI parcel search',
                      'GIS layer management',
                      'Subdivision review support',
                      'Zoning and planning checks',
                      'Document tracking',
                      'Report generation',
                      'Data limitation alerts',
                      'Role-based workflow'
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-emerald-50 items-start">
                        <div className="mt-2 h-2 w-2 rounded-full bg-emerald-300 shrink-0" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* FEATURE EXPERIENCE SECTION */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-700 font-semibold">
                FEATURE EXPERIENCE
              </p>
              <h2 className="mt-4 text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                Built to keep subdivision review organized
              </h2>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                GeoSmart Manager is designed to help users move through land subdivision review with clear tools, organized records, GIS-supported context, and structured planning outputs.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                {
                  title: 'Start with parcel context',
                  desc: 'Use parcel references and available GIS layers to understand the land location, surrounding context, and planning conditions before review begins.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 4L9 7" />
                    </svg>
                  )
                },
                {
                  title: 'Keep project work connected',
                  desc: 'Manage client details, uploaded documents, assigned reviews, project status, and planning notes in one organized workflow.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )
                },
                {
                  title: 'Support technical review',
                  desc: 'Use subdivision tools, zoning context, building footprint checks, and data limitation alerts to support early-stage planning decisions.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )
                },
                {
                  title: 'Prepare clearer outputs',
                  desc: 'Generate structured preliminary reports that summarize project information, GIS observations, review checks, and important limitations.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )
                }
              ].map((card) => (
                <div key={card.title} className="group rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                    {card.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-slate-600 leading-relaxed text-sm">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 md:p-10 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 shadow-2xl">
              <div className="max-w-2xl">
                <p className="text-lg md:text-xl font-medium leading-relaxed opacity-90">
                  From parcel search to report output, GeoSmart Manager keeps land planning work structured, traceable, and easier to review.
                </p>
              </div>
              <Link
                to="/features#how-it-works"
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-md border border-white/20 transition hover:bg-white/20 shrink-0"
              >
                View Workflow
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-24 bg-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#064e3b_1px,transparent_1px)] [background-size:24px_24px]" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                How It Works
              </h2>
              <p className="mt-6 text-xl text-slate-600 leading-relaxed">
                Follow a simple GIS-supported workflow from parcel search to subdivision review and structured planning outputs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Select or search parcel',
                  desc: 'Use UPI search to identify the parent parcel from available Kigali parcel data.'
                },
                {
                  step: '02',
                  title: 'Review parcel information',
                  desc: 'Inspect administrative location, parcel context, nearby features, and available master plan zones.'
                },
                {
                  step: '03',
                  title: 'Draw or upload proposal',
                  desc: 'Create proposed plot polygons or upload a prepared GeoJSON layout where available.'
                },
                {
                  step: '04',
                  title: 'Run planning checks',
                  desc: 'Review zoning context, building footprint conflicts, spatial constraints, and available planning rules.'
                },
                {
                  step: '05',
                  title: 'Review observations',
                  desc: 'Check system-generated observations, data limitations, and items that may require official verification.'
                },
                {
                  step: '06',
                  title: 'Generate report',
                  desc: 'Export a structured preliminary planning report with maps, checks, observations, and review outcomes.'
                }
              ].map((item) => (
                <div key={item.step} className="group relative p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 hover:border-emerald-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-emerald-800 transition-colors">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AUTHORITATIVE CTA */}
        <section className="py-24 px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="relative rounded-[3rem] bg-slate-900 p-10 md:p-16 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-slate-950 to-slate-950" />
              
              <div className="relative z-10 text-center lg:text-left flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                <div className="max-w-2xl">
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">Ready to start your <br /><span className="text-emerald-400">subdivision review?</span></h2>
                  <p className="mt-6 text-lg text-slate-300 leading-relaxed">
                    Access the full GeoSmart Manager suite and secure clearer planning insights today.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-6 shrink-0">
                  <Link className="px-8 py-4 rounded-2xl bg-emerald-500 text-white font-black text-lg hover:bg-emerald-400 transition-all hover:scale-105 shadow-xl shadow-emerald-500/20" to="/register">
                    Create Account
                  </Link>
                  <Link className="px-8 py-4 rounded-2xl border-2 border-white/20 text-white font-black text-lg hover:bg-white/10 transition-all" to="/login">
                    Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PublicLayout>
  )
}


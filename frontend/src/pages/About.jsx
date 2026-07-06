import React from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { publicImages } from '../assets/publicImages'

export default function About() {
  return (
    <PublicLayout>
      <div className="space-y-0 antialiased">
        
        {/* HERO & OVERLAPPING CARD WRAPPER */}
        <div className="relative bg-white pb-20">
          {/* PART A — HERO IMAGE (Image-only with soft overlay) */}
          <section className="relative left-1/2 right-1/2 -mt-[136px] h-[360px] md:h-[440px] lg:h-[520px] w-screen -translate-x-1/2 overflow-hidden bg-slate-950">
            <img
              src={publicImages.dividedLandImage}
              alt="GeoSmart land planning professional banner"
              className="public-hero-image absolute inset-0 h-full w-full object-cover brightness-[0.78]"
            />
            <div className="public-hero-overlay absolute inset-0" />
          </section>

          {/* PART B & C — OVERLAPPING INFORMATION CARD */}
          <section className="relative z-20 -mt-28 md:-mt-36 lg:-mt-44 max-w-7xl mx-auto px-6 lg:px-8">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 md:p-12 shadow-2xl text-white">
              <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-10 lg:gap-14 items-start">
                
                {/* Left Column: About Wording */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    About GeoSmart Manager
                  </h1>
                  <div className="mt-6 space-y-4 text-base md:text-lg leading-relaxed text-emerald-50">
                    <p>
                      GeoSmart Manager supports professional land planning, GIS-based parcel review, and organized subdivision workflows for Rwanda.
                    </p>
                    <p>
                      The platform brings together parcel context, zoning references, building footprint checks, project records, document tracking, and structured reporting to help users prepare clearer subdivision review outputs.
                    </p>
                    <p>
                      By connecting spatial data with project coordination, GeoSmart Manager helps users move from scattered information to a more organized and informed planning process.
                    </p>
                  </div>
                </div>

                {/* Right Column: Platform Focus */}
                <div className="lg:border-l lg:border-white/25 lg:pl-10">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
                    Platform Focus
                  </p>
                  <ul className="mt-6 space-y-4">
                    {[
                      'GIS-based parcel review',
                      'Subdivision workflow support',
                      'Planning and zoning context',
                      'Document and project tracking',
                      'Report-ready review outputs',
                      'Role-based collaboration'
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

        {/* OUR FOUNDATION SECTION */}
        <section className="public-gradient-section py-24 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-700 font-semibold">
                OUR FOUNDATION
              </p>
              <h2 className="mt-4 text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                Purpose-driven land planning support
              </h2>
              <p className="mt-5 text-lg text-slate-600 leading-relaxed">
                GeoSmart Manager is built around a clear mission, practical goals, and a structured approach to supporting GIS-based subdivision review workflows.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: 'Mission',
                  desc: 'GeoSmart Manager aims to support professional land planning by bringing parcel information, GIS datasets, subdivision workflow tools, and planning review outputs into one organized platform for Rwanda.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  title: 'Overall Goal',
                  desc: 'The overall goal is to improve how land subdivision projects are organized, reviewed, documented, and reported through clearer spatial context, better workflow coordination, and structured planning outputs.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )
                },
                {
                  title: 'Our Approach',
                  desc: 'The platform connects land surveyors, clients, and administrators through role-based workflows that support project tracking, document management, GIS review, and report generation.',
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )
                }
              ].map((card) => (
                <div key={card.title} className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-700 group-hover:text-white">
                    {card.icon}
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-4 text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-3xl bg-emerald-950 px-8 py-8 text-center text-lg leading-relaxed text-emerald-50 shadow-lg">
              Together, these principles guide how GeoSmart Manager supports clearer, more organized, and more data-informed land planning workflows.
            </div>
          </div>
        </section>

        {/* PART F — SECTION BELOW THE CARD */}
        <section className="pt-16 md:pt-20 pb-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                  Built to support better planning decisions
                </h2>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
                  GeoSmart Manager organizes land subdivision projects by integrating GIS spatial audits, zoning compliance checks, and professional reporting into one unified platform. We focus on delivering high-fidelity insights that support the entire lifecycle of a planning review.
                </p>
                <div className="mt-10 flex gap-4">
                  <Link to="/features" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20">
                    Explore Features
                  </Link>
                  <Link to="/contact" className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition">
                    Get in Touch
                  </Link>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-3xl border border-emerald-100 shadow-2xl">
                <img
                  src={publicImages.aboutUsImage}
                  alt="Professional GIS planning review in action"
                  className="w-full h-[360px] md:h-[460px] lg:h-[560px] object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* AUTHORITATIVE CTA */}
        <section className="py-24 px-6 lg:px-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="relative rounded-[3rem] bg-slate-900 p-10 md:p-16 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-slate-950 to-slate-950" />
              
              <div className="relative z-10 text-center lg:text-left flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                <div className="max-w-2xl">
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">Secure clearer planning <br /><span className="text-emerald-400">insights today.</span></h2>
                  <p className="mt-6 text-lg text-slate-300 leading-relaxed">
                    Join professional surveyors and planners using GeoSmart Manager to organize their subdivision review workflow.
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

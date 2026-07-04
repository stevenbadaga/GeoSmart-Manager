import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { publicImages } from '../assets/publicImages'

const workflowSlides = [
  { title: 'Search or select a parcel', shortTitle: 'Select Parcel', desc: 'Find the land parcel using available parcel data or UPI-based search.', tag: 'STEP 01', img: publicImages.authLandscapeImage },
  { title: 'Review zoning and location context', shortTitle: 'Review Data', desc: 'Check the parcel against available zoning, master plan, boundary, and location datasets.', tag: 'STEP 02', img: publicImages.lakeLandscapeImage },
  { title: 'Draw or upload proposed plots', shortTitle: 'Draw Plots', desc: 'Create or upload proposed subdivision layouts for early-stage spatial review.', tag: 'STEP 03', img: publicImages.dividedLandImage },
  { title: 'Run planning support checks', shortTitle: 'Run Checks', desc: 'Review the proposal against available planning rules, GIS layers, and data constraints.', tag: 'STEP 04', img: publicImages.sunriseLandscapeImage },
  { title: 'Generate a preliminary report', shortTitle: 'Generate Report', desc: 'Produce a structured report summarizing checks, observations, limitations, and review outcomes.', tag: 'STEP 05', img: publicImages.authLandscapeImage },
  { title: 'Continue with official submission', shortTitle: 'Submit Review', desc: 'Use the results to prepare better documentation before submitting through official channels.', tag: 'STEP 06', img: publicImages.lakeLandscapeImage }
]

function WorkflowOrbitScreen({ slide, className = '', ariaHidden = false }) {
  return (
    <article
      className={`workflow-screen-face ${className}`.trim()}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : slide.shortTitle}
    >
      <div className="workflow-screen-media">
        <img src={slide.img} alt={ariaHidden ? '' : slide.shortTitle} />
      </div>
      <div className="workflow-screen-body">
        <span className="workflow-screen-tag whitespace-nowrap">{slide.tag}</span>
        <h3 className="whitespace-nowrap truncate">{slide.shortTitle}</h3>
      </div>
    </article>
  )
}

function getSlidesPerView() {
  if (typeof window === 'undefined') return 1
  if (window.innerWidth >= 1280) return 3
  if (window.innerWidth >= 768) return 2
  return 1
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [slidesPerView, setSlidesPerView] = useState(getSlidesPerView)

  const maxSlideIndex = Math.max(0, workflowSlides.length - slidesPerView)
  const totalSlidePages = maxSlideIndex + 1

  useEffect(() => {
    const handleResize = () => setSlidesPerView(getSlidesPerView())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCurrentSlide((prev) => Math.min(prev, maxSlideIndex))
  }, [maxSlideIndex])

  useEffect(() => {
    if (isPaused || maxSlideIndex === 0) return
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev >= maxSlideIndex ? 0 : prev + 1))
    }, 3000)
    return () => clearInterval(timer)
  }, [isPaused, maxSlideIndex])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev >= maxSlideIndex ? 0 : prev + 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? maxSlideIndex : prev - 1))
  }

  return (
    <PublicLayout>
      <div className="space-y-16">
        <section className="public-home-hero relative left-1/2 right-1/2 -mt-10 w-screen -translate-x-1/2 isolate overflow-hidden bg-[#0c3028]">
          <img
            src={publicImages.sunriseLandscapeImage}
            alt="Kigali planning landscape used across the GeoSmart home page hero"
            className="public-home-hero-image absolute inset-0 h-full w-full object-cover"
          />
          <div className="public-home-hero-overlay absolute inset-0 bg-[linear-gradient(90deg,rgba(247,245,238,0.96)_0%,rgba(247,245,238,0.92)_34%,rgba(247,245,238,0.68)_54%,rgba(8,30,22,0.2)_100%)]" />
          <div className="public-home-hero-glow absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,196,106,0.2),transparent_34%)]" />

          <div className="relative mx-auto min-h-[580px] w-full max-w-[1400px] px-6 py-10 sm:min-h-[620px] sm:px-6 sm:py-14 lg:min-h-[700px] lg:px-10 lg:py-16">
            <div className="public-home-hero-copy max-w-4xl">
              <p className="public-home-hero-kicker text-xs font-black uppercase tracking-[0.24em] text-[#124E44]/78">GeoSmart Manager</p>
              <h1 className="public-home-hero-title mt-4 max-w-4xl text-5xl font-black tracking-[-0.06em] text-ink sm:text-6xl lg:text-7xl">
                AI-Assisted Land Subdivision Planning and Zoning Compliance
              </h1>
              <p className="public-home-hero-text mt-5 max-w-2xl text-base leading-7 text-ink/68 sm:text-lg">
                Run preliminary land subdivision checks using parcel data, zoning rules, administrative boundaries, building footprints, and planning constraints for Kigali.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="btn-primary" to="/subdivision">Start Subdivision Check</Link>
                <Link className="btn-secondary bg-white/[0.88] backdrop-blur-sm" to="/features#how-it-works">View How It Works</Link>
              </div>
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US SECTION */}
        <section className="py-24 bg-white">
          <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Image Collage Area */}
              <div className="relative min-h-[520px] isolate">
                {/* Main large card */}
                <div className="absolute top-0 left-0 w-[80%] h-[70%] rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 z-10 rotate-[-2deg]">
                  <img src={publicImages.dividedLandImage} alt="Large land subdivision view" className="w-full h-full object-cover" />
                </div>
                {/* Secondary card overlapping bottom-right */}
                <div className="absolute bottom-4 right-0 w-[70%] h-[60%] rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 z-20 rotate-[1deg]">
                  <img src={publicImages.lakeLandscapeImage} alt="Kigali landscape context" className="w-full h-full object-cover" />
                </div>
                {/* Third small card overlapping top-right */}
                <div className="absolute top-12 right-4 w-[45%] h-[40%] rounded-3xl overflow-hidden shadow-2xl border border-emerald-100 z-30 rotate-[3deg]">
                  <img src={publicImages.authLandscapeImage} alt="Planning support view" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Text Content Area */}
              <div className="space-y-8">
                <div>
                  <p className="text-sm uppercase tracking-widest text-[#124E44] font-black">WHY CHOOSE US</p>
                  <h2 className="mt-4 text-4xl lg:text-5xl font-black text-ink leading-[1.1]">
                    Why choose GeoSmart Manager for early land planning?
                  </h2>
                </div>

                <p className="text-base leading-8 text-ink/65">
                  GeoSmart Manager brings together GIS datasets, parcel information, planning rules, and workflow tools to support early-stage land subdivision review in Kigali. It helps land surveyors, clients, and administrators understand project context before formal submission.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  {[
                    'GIS-based parcel context',
                    'Preliminary subdivision review',
                    'Planning rule awareness',
                    'Clearer early decisions',
                    'Organized workflow',
                    'Professional planning support'
                  ].map((benefit) => (
                    <div key={benefit} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#124E44]/10 text-[#124E44]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-ink/80">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <Link className="btn-primary inline-flex items-center px-8 py-4 text-base" to="/features">
                    Explore Features
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section className="py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* Heading Wrapper */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-sm uppercase tracking-widest text-emerald-700 font-semibold">WORKFLOW VIEW</p>
                <h2 className="mt-3 text-4xl lg:text-5xl font-bold text-slate-900">How GeoSmart Manager works</h2>
                <p className="mt-4 max-w-2xl text-slate-600 leading-relaxed">
                  Move from parcel identification to structured planning outputs through a simple GIS-supported workflow.
                </p>
              </div>
              <div>
                <Link className="btn-primary inline-flex items-center px-8 py-3 text-sm font-semibold rounded-xl" to="/features">
                  Explore Features
                </Link>
              </div>
            </div>

            <div
              className={`workflow-screen-stage workflow-screen-shell mt-12 hidden lg:block ${isPaused ? 'workflow-orbit-paused' : ''}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Stronger vignette overlay */}
              <div className="workflow-screen-stage-vignette" />

              {/* Ambient holographic background grid & contour SVG overlay */}
              <svg className="workflow-screen-stage-gis-overlay" viewBox="0 0 1600 700" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Topographic curves */}
                <path d="M-100,220 C320,180 500,420 900,340 C1220,280 1400,560 1800,480" stroke="rgba(52,211,153,0.06)" strokeWidth="1.2" fill="none" />
                <path d="M-100,270 C330,230 480,450 880,390 C1200,330 1380,590 1780,530" stroke="rgba(52,211,153,0.06)" strokeWidth="1.2" fill="none" />
                <path d="M-100,320 C340,280 460,480 860,440 C1180,380 1360,620 1760,580" stroke="rgba(52,211,153,0.04)" strokeWidth="1.2" strokeDasharray="5 7" fill="none" />
                <path d="M-100,370 C350,330 440,510 840,490 C1160,430 1340,650 1740,630" stroke="rgba(52,211,153,0.03)" strokeWidth="1.2" fill="none" />
                
                {/* Faint GIS Land boundaries/parcels */}
                <polygon points="180,180 320,150 360,260 210,300" stroke="rgba(52,211,153,0.05)" strokeWidth="1" fill="none" />
                <polygon points="320,150 480,130 510,240 360,260" stroke="rgba(52,211,153,0.05)" strokeWidth="1" fill="none" />
                <polygon points="210,300 360,260 330,390 170,360" stroke="rgba(52,211,153,0.05)" strokeWidth="1" fill="none" />
                
                {/* Right side parcels */}
                <polygon points="1200,160 1350,130 1380,240 1230,270" stroke="rgba(52,211,153,0.05)" strokeWidth="1" fill="none" />
                <polygon points="1350,130 1500,110 1530,220 1380,240" stroke="rgba(52,211,153,0.05)" strokeWidth="1" fill="none" />
                
                {/* Thin grid lines */}
                <line x1="0" y1="150" x2="1600" y2="150" stroke="rgba(52,211,153,0.03)" strokeWidth="0.8" />
                <line x1="0" y1="350" x2="1600" y2="350" stroke="rgba(52,211,153,0.03)" strokeWidth="0.8" />
                <line x1="0" y1="550" x2="1600" y2="550" stroke="rgba(52,211,153,0.03)" strokeWidth="0.8" />
                <line x1="400" y1="0" x2="400" y2="700" stroke="rgba(52,211,153,0.03)" strokeWidth="0.8" />
                <line x1="800" y1="0" x2="800" y2="700" stroke="rgba(52,211,153,0.03)" strokeWidth="0.8" />
                <line x1="1200" y1="0" x2="1200" y2="700" stroke="rgba(52,211,153,0.03)" strokeWidth="0.8" />

                {/* Coordinate crosshair and marker nodes */}
                <g stroke="rgba(52,211,153,0.18)" strokeWidth="1">
                  <line x1="360" y1="240" x2="360" y2="280" />
                  <line x1="340" y1="260" x2="380" y2="260" />
                  <circle cx="360" cy="260" r="14" stroke="rgba(52,211,153,0.08)" fill="none" />
                  <circle cx="360" cy="260" r="3" fill="#34d399" stroke="none" />
                </g>
                <g stroke="rgba(52,211,153,0.18)" strokeWidth="1">
                  <line x1="1230" y1="250" x2="1230" y2="290" />
                  <line x1="1210" y1="270" x2="1250" y2="270" />
                  <circle cx="1230" cy="270" r="14" stroke="rgba(52,211,153,0.08)" fill="none" />
                  <circle cx="1230" cy="270" r="3" fill="#34d399" stroke="none" />
                </g>
              </svg>

              {/* Pulsing central projector backplate glow */}
              <div className="workflow-screen-glow-backplate" />

              <div className="absolute left-6 top-6 z-20 flex items-center rounded-xl border border-emerald-500/10 bg-emerald-950/20 px-3.5 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.24em] text-emerald-300/80 backdrop-blur-md select-none">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                Hologram (Hover to Pause)
              </div>

              {/* Holographic elliptical orbit guide ring */}
              <div className="workflow-screen-orbit-ring" />

              <div className="workflow-screen-carousel">
                {workflowSlides.map((slide, index) => {
                  const angle = index * (360 / workflowSlides.length)
                  const roll = [-3, -1, 1, 3, 1, -2][index % 6]

                  return (
                    <div
                      key={slide.tag}
                      className="workflow-screen-node"
                      style={{
                        '--screen-angle': `${angle}deg`,
                        '--screen-roll': `${roll}deg`,
                        '--screen-delay': `${index * -1.2}s`,
                        '--screen-lighting-delay': `${index * 4 - 24}s`
                      }}
                    >
                      <div className="workflow-screen-bobber">
                        <div className="workflow-screen-monitor">
                          <WorkflowOrbitScreen slide={slide} className="workflow-screen-face-front" />
                          <WorkflowOrbitScreen slide={slide} className="workflow-screen-face-back" ariaHidden />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="workflow-screen-figure-wrap">
                <div className="workflow-screen-figure-shadow" />
                {/* Holographic light pulse at finger level */}
                <div className="holographic-finger-pulse" />
                <img
                  src={publicImages.cheerfulManImage}
                  alt="Cheerful planner working at a desk while planning screens rotate around him"
                  className="workflow-screen-figure"
                />
              </div>
            </div>

            <div className="mt-6 hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3">
              {workflowSlides.map((slide) => (
                <div key={`${slide.tag}-summary`} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.35)]">
                  <div className="text-[0.7rem] font-black uppercase tracking-[0.24em] text-emerald-700">{slide.tag}</div>
                  <div className="mt-2 text-lg font-bold text-slate-900">{slide.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{slide.desc}</p>
                </div>
              ))}
            </div>

            <div
              className="mt-12 overflow-x-hidden lg:hidden"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white/80 p-3 shadow-[0_20px_45px_-24px_rgba(15,23,42,0.2)]">
                <div
                  className="flex transition-transform duration-700 ease-out"
                  style={{
                    width: `${(workflowSlides.length / slidesPerView) * 100}%`,
                    transform: `translateX(-${(currentSlide * 100) / workflowSlides.length}%)`
                  }}
                >
                  {workflowSlides.map((slide) => (
                    <article
                      key={`${slide.tag}-mobile`}
                      className="px-3"
                      style={{ flex: `0 0 ${100 / workflowSlides.length}%` }}
                      aria-label={slide.title}
                    >
                      <div className="group relative h-[360px] overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-slate-900 shadow-lg">
                        <img
                          src={slide.img}
                          alt={slide.shortTitle}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,30,22,0.18)_0%,rgba(8,30,22,0.45)_48%,rgba(8,30,22,0.92)_100%)]" />
                        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_60%)]" />
                        <div className="absolute inset-x-0 bottom-0 p-6">
                          <div className="rounded-[1.4rem] border border-white/15 bg-slate-950/28 p-4 backdrop-blur-[6px] text-center overflow-hidden">
                            <span className="inline-flex rounded-full bg-white/92 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.22em] text-emerald-800 shadow-sm backdrop-blur-sm mb-2 whitespace-nowrap">
                              {slide.tag}
                            </span>
                            <h3 className="text-[1.25rem] font-black leading-tight text-white whitespace-nowrap truncate">{slide.shortTitle}</h3>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between lg:hidden">
              <button
                onClick={prevSlide}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-white transition-colors shadow-md hover:bg-emerald-800"
                aria-label="Previous slide"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="relative mx-6 h-px flex-1 overflow-hidden bg-emerald-200">
                <div
                  className="absolute left-0 top-0 h-full bg-emerald-700 transition-all duration-500"
                  style={{ width: `${(totalSlidePages <= 1 ? 100 : ((currentSlide + 1) / totalSlidePages) * 100)}%` }}
                />
              </div>

              <button
                onClick={nextSlide}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-white transition-colors shadow-md hover:bg-emerald-800"
                aria-label="Next slide"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-700 p-8 md:p-12 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div>
                  <p className="text-sm uppercase tracking-widest text-emerald-100 font-semibold">NEXT STEP</p>
                  <h2 className="mt-3 text-4xl lg:text-5xl font-bold text-white">Ready to test a parcel?</h2>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-emerald-50/90">
                    Use the protected Subdivision Planner to search a parent parcel by UPI and generate a preliminary report.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 shrink-0">
                  <Link className="inline-flex items-center rounded-xl bg-white text-emerald-800 px-6 py-3 font-semibold hover:bg-emerald-50 transition" to="/subdivision">
                    Open Planner
                  </Link>
                  <Link className="inline-flex items-center rounded-xl border border-white/30 text-white px-6 py-3 font-semibold hover:bg-white/10 transition" to="/features#how-it-works">
                    How It Works
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

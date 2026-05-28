import React from 'react'

export default function PublicImagePlaceholder({ label = 'GIS map preview placeholder' }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#124E44]/15 bg-gradient-to-br from-[#123E36] via-[#1F6F5F] to-[#E8C46A] p-6 text-white shadow-[0_28px_70px_-52px_rgba(15,23,42,0.85)]">
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/14 blur-2xl" />
      <div className="grid min-h-64 place-items-center rounded-[1.5rem] border border-white/20 bg-white/10 text-center backdrop-blur">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#E8C46A]">Replaceable Visual Area</p>
          <p className="mt-3 text-2xl font-black tracking-[-0.03em]">{label}</p>
          <p className="mt-2 text-sm text-white/70">Add a map screenshot, workflow illustration, or report preview here later.</p>
        </div>
      </div>
    </div>
  )
}

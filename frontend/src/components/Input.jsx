import React from 'react'

export default function Input({ label, error, ...props }) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-[0.825rem] font-bold uppercase tracking-wider text-slate-500 ml-1">{label}</span>}
      <input className={`input ${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' : ''}`} {...props} />
      {error && <p className="text-xs font-bold text-rose-600 mt-1.5 ml-1">{error}</p>}
    </label>
  )
}

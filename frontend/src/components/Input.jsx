import React from 'react'

export default function Input({ label, ...props }) {
  return (
    <label className="block space-y-2">
      {label && <span className="text-sm font-medium text-ink/80">{label}</span>}
      <input className="input" {...props} />
    </label>
  )
}

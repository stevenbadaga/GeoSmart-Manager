import React from 'react'

export default function Card({ title, children, className = '', premium = false, ...props }) {
  const baseClass = premium ? 'card-premium' : 'card'
  return (
    <div className={`${baseClass} overflow-hidden p-6 md:p-8 ${className}`} {...props}>
      {title && (
        <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

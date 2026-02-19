import React from 'react'

export default function Card({ title, children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      {children}
    </div>
  )
}

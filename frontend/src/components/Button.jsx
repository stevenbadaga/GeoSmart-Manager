import React from 'react'

export default function Button({ variant = 'primary', className = '', ...props }) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary'
  return (
    <button
      className={`${base} cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#0D6B50] focus-visible:ring-offset-2 focus-visible:outline-none ${className}`}
      {...props}
    />
  )
}

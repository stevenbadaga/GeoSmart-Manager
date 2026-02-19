import React from 'react'

export default function Button({ variant = 'primary', className = '', ...props }) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary'
  return <button className={`${base} ${className}`} {...props} />
}

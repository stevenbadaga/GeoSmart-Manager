import React from 'react'

export default function Button({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger'
  }
  const base = variants[variant] || variants.primary
  return (
    <button
      className={`${base} ${className}`.trim()}
      {...props}
    />
  )
}

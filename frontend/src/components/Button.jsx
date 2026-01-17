import { cn } from '../lib/utils'

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-600',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900',
    outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600',
  }
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-base',
  }
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />
}


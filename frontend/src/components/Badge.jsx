import { cn } from '../lib/utils'

export function Badge({ tone = 'slate', className, ...props }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-rose-100 text-rose-700',
    blue: 'bg-indigo-100 text-indigo-700',
  }

  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', tones[tone], className)} {...props} />
}


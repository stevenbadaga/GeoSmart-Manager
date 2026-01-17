import { cn } from '../lib/utils'

export function Modal({ open, title, children, onClose, className }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className={cn('w-full max-w-lg rounded-2xl bg-white shadow-xl', className)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <button className="text-sm text-slate-500 hover:text-slate-900" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}


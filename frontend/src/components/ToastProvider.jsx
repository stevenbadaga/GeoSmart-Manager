/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cn } from '../lib/utils'

const ToastContext = createContext(null)

function ToastItem({ toast, onDismiss }) {
  const tones = {
    info: 'border-slate-200 bg-white text-slate-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }

  return (
    <div className={cn('w-full rounded-2xl border px-4 py-3 shadow-lg', tones[toast.tone || 'info'])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{toast.title}</div>
          {toast.message ? <div className="mt-1 text-sm opacity-90">{toast.message}</div> : null}
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-semibold opacity-70 hover:opacity-100"
          onClick={() => onDismiss(toast.id)}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    ({ tone = 'info', title, message, durationMs = 3500 }) => {
      const id = crypto.randomUUID()
      const toast = { id, tone, title, message }
      setToasts((prev) => [toast, ...prev].slice(0, 4))
      window.setTimeout(() => dismiss(id), durationMs)
      return id
    },
    [dismiss],
  )

  const api = useMemo(() => {
    return {
      push,
      info: (title, message) => push({ tone: 'info', title, message }),
      success: (title, message) => push({ tone: 'success', title, message }),
      error: (title, message) => push({ tone: 'error', title, message, durationMs: 5000 }),
      warning: (title, message) => push({ tone: 'warning', title, message }),
      dismiss,
    }
  }, [dismiss, push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] w-[min(420px,calc(100vw-2rem))] space-y-2">
        {toasts.map((t) => (
          <div className="pointer-events-auto" key={t.id}>
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}


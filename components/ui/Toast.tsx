'use client'
// components/ui/Toast.tsx — zero-dependency toast

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { clsx } from 'clsx'

export interface ToastData {
  id:      string
  type:    'success' | 'error'
  message: string
}

// Global store — simple pub/sub
type Listener = (t: ToastData) => void
const listeners: Listener[] = []
export function showToast(type: ToastData['type'], message: string | undefined) {
  const t: ToastData = { id: Math.random().toString(36).slice(2), type, message: message ?? (type === 'success' ? 'Saved' : 'Something went wrong') }
  listeners.forEach((fn) => fn(t))
}

function ToastItem({ toast, onRemove }: { toast: ToastData; onRemove: () => void }) {
  useEffect(() => {
    const t = setTimeout(onRemove, 4000)
    return () => clearTimeout(t)
  }, [onRemove])

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium',
      'backdrop-blur-md animate-in slide-in-from-bottom-2',
      toast.type === 'success'
        ? 'bg-green-900/80 border-green-700/50 text-green-200'
        : 'bg-red-900/80 border-red-700/50 text-red-200'
    )}>
      {toast.type === 'success'
        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        : <XCircle    className="w-4 h-4 text-red-400 flex-shrink-0"   />
      }
      <span className="flex-1">{toast.message}</span>
      <button onClick={onRemove} className="opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const handler = (t: ToastData) => setToasts((prev) => [...prev, t])
    listeners.push(handler)
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1) }
  }, [])

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => remove(t.id)} />
      ))}
    </div>
  )
}

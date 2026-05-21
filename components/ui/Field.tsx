'use client'
// components/ui/Field.tsx
// Inline-editable field — shows value, click to edit, auto-saves on blur

import { useState, useRef, useEffect } from 'react'
import { Check, Loader2, Pencil } from 'lucide-react'
import { clsx } from 'clsx'
import type { ActionResult } from '@/lib/actions'

interface FieldProps {
  label:       string
  value:       string | number
  multiline?:  boolean
  numeric?:    boolean
  rows?:       number
  className?:  string
  onSave:      (val: string) => Promise<ActionResult>
}

export function Field({ label, value, multiline, numeric, rows = 3, className, onSave }: FieldProps) {
  const [editing,  setEditing]  = useState(false)
  const [current,  setCurrent]  = useState(String(value ?? ''))
  const [saved,    setSaved]    = useState(String(value ?? ''))
  const [loading,  setLoading]  = useState(false)
  const [status,   setStatus]   = useState<'idle'|'ok'|'err'>('idle')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const handleSave = async () => {
    if (current === saved) { setEditing(false); return }
    setLoading(true)
    const result = await onSave(current)
    setLoading(false)
    if (result.success) {
      setSaved(current)
      setStatus('ok')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('err')
      setTimeout(() => setStatus('idle'), 3000)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); handleSave() }
    if (e.key === 'Escape') { setCurrent(saved); setEditing(false) }
  }

  const inputClass = clsx(
    'w-full bg-[#0f1117] border border-blue-500 ring-1 ring-blue-500/30 rounded-lg px-3 py-2 text-sm text-white',
    'focus:outline-none transition-colors',
    className
  )

  return (
    <div className="group">
      <div className="flex items-center gap-2 mb-1.5">
        <label className="admin-label">{label}</label>
        {status === 'ok'  && <Check  className="w-3 h-3 text-green-400" />}
        {loading          && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
        {status === 'err' && <span className="text-red-400 text-xs">Save failed</span>}
      </div>

      {editing ? (
        multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={current}
            rows={rows}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={clsx(inputClass, 'resize-none leading-relaxed')}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={numeric ? 'number' : 'text'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />
        )
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-left group/field"
        >
          <div className={clsx(
            'w-full px-3 py-2 rounded-lg text-sm border transition-all',
            'bg-[#0f1117] border-[#2a2d3e] text-[#e2e8f0]',
            'group-hover/field:border-[#3a3d4e] hover:border-[#3a3d4e]',
            !current && 'text-[#4b5563] italic',
            className
          )}>
            <span className="flex items-start gap-2">
              <span className="flex-1 whitespace-pre-wrap break-words leading-relaxed min-h-[1.2em]">
                {current || `Click to add ${label.toLowerCase()}`}
              </span>
              <Pencil className="w-3 h-3 text-[#4b5563] flex-shrink-0 mt-0.5 opacity-0 group-hover/field:opacity-100 transition-opacity" />
            </span>
          </div>
        </button>
      )}
    </div>
  )
}


// ─── Toggle Field ─────────────────────────────────────────────────────────────

interface ToggleProps {
  label:   string
  value:   boolean
  onSave:  (val: boolean) => Promise<ActionResult>
}

export function ToggleField({ label, value, onSave }: ToggleProps) {
  const [current, setCurrent] = useState(value)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    const next = !current
    setCurrent(next)
    setLoading(true)
    await onSave(next)
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between">
      <label className="admin-label mb-0">{label}</label>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={clsx(
          'relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0',
          current ? 'bg-blue-600' : 'bg-[#2a2d3e]'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          current ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}

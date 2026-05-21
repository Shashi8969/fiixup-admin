'use client'
// components/ui/CreateModal.tsx
// Reusable modal shell for all Create New flows

import { X } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  open:     boolean
  onClose:  () => void
  title:    string
  subtitle?: string
  width?:   'md' | 'lg' | 'xl'
  children: React.ReactNode
}

export function CreateModal({ open, onClose, title, subtitle, width = 'lg', children }: Props) {
  if (!open) return null

  const maxW = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }[width]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={clsx('bg-[#111827] border border-[#1e2535] rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl', maxW)}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#1e2535] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#e2e8f0]">{title}</h2>
            {subtitle && <p className="text-sm text-[#6b7280] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white transition-colors ml-4 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────────
export function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < current  ? 'bg-green-500 text-white' :
              i === current ? 'bg-blue-600 text-white' :
                              'bg-[#2a2d3e] text-[#6b7280]'
            )}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={clsx('text-xs font-medium whitespace-nowrap',
              i === current ? 'text-[#e2e8f0]' : 'text-[#6b7280]'
            )}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={clsx('h-px flex-1 mx-3', i < current ? 'bg-green-500' : 'bg-[#2a2d3e]')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Reusable form field ────────────────────────────────────────────────────────
export function CField({
  label, value, onChange, placeholder, required, hint, multiline, rows, type
}: {
  label:       string
  value:       string
  onChange:    (v: string) => void
  placeholder?: string
  required?:   boolean
  hint?:       string
  multiline?:  boolean
  rows?:       number
  type?:       string
}) {
  return (
    <div className="space-y-1.5">
      <label className="admin-label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={rows ?? 3}
          className="admin-textarea text-sm" />
      ) : (
        <input type={type ?? 'text'} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className="admin-input text-sm" />
      )}
      {hint && <p className="text-xs text-[#475569]">{hint}</p>}
    </div>
  )
}

// ── Select field ───────────────────────────────────────────────────────────────
export function CSelect({
  label, value, onChange, options, required, hint
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string }[]
  required?: boolean
  hint?:    string
}) {
  return (
    <div className="space-y-1.5">
      <label className="admin-label">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="admin-input text-sm bg-[#0f1117]">
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-xs text-[#475569]">{hint}</p>}
    </div>
  )
}

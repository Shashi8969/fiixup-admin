'use client'

import type { ReactNode } from 'react'
import { clsx } from 'clsx'

export function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[#6b7280] text-sm italic py-3 px-1">{children}</p>
}

export function SectionHeader({ title, count, children }: {
  title: string; count: number; children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="admin-section-title">
        {title}
        <span className="ml-2 text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full font-normal">{count}</span>
      </h2>
      {children}
    </div>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
export function Toggle({ value, onChange, label }: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-[#6b7280]">{label}</span>}
      <button onClick={() => onChange(!value)}
        className={clsx('relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          value ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      <span className={clsx('text-xs font-semibold', value ? 'text-green-400' : 'text-red-400')}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  )
}

// ── Delete button ──────────────────────────────────────────────────────────────

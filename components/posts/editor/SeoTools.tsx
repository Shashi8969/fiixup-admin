'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Field } from '@/components/ui/Field'

export const SEO_LIMITS = {
  meta_title:       { min: 40, ideal: 60, max: 70  },
  meta_description: { min: 100, ideal: 155, max: 165 },
} as const

export function CharCounter({ value, field }: { value: string; field: keyof typeof SEO_LIMITS }) {
  const len    = value.length
  const limits = SEO_LIMITS[field]
  const state  =
    len === 0           ? 'empty'   :
    len < limits.min    ? 'short'   :
    len <= limits.ideal ? 'perfect' :
    len <= limits.max   ? 'long'    : 'over'

  const labelMap  = { empty: 'Empty', short: 'Too short', perfect: '✓ Perfect', long: 'Getting long', over: 'Too long' }
  const colorText = { empty: 'text-[#6b7280]', short: 'text-amber-400', perfect: 'text-green-400', long: 'text-amber-400', over: 'text-red-400' }
  const colorBar  = { empty: 'bg-[#2a2d3e]',   short: 'bg-amber-400',   perfect: 'bg-green-400',   long: 'bg-amber-400',  over: 'bg-red-500'   }
  const pct       = Math.min(len / limits.max, 1)

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex justify-between">
        <span className={clsx('text-xs font-medium', colorText[state])}>{labelMap[state]}</span>
        <span className={clsx('text-xs tabular-nums', colorText[state])}>
          {len} / {limits.ideal}
          <span className="text-[#6b7280]"> (max {limits.max})</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-[#2a2d3e] overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-200', colorBar[state])} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

export function SerpPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const t = title       || 'Page Title'
  const d = description || 'Meta description will appear here in Google search results…'
  return (
    <div className="rounded-xl bg-white p-4 space-y-0.5 border border-gray-200 shadow-sm">
      <p className="text-xs" style={{ color: '#202124', fontFamily: 'arial,sans-serif' }}>
        <span style={{ color: '#4d5156' }}>fiixup.in</span>
        <span style={{ color: '#4d5156' }}> › blog › {slug || 'post-slug'}</span>
      </p>
      <p className="text-base font-medium leading-snug line-clamp-1" style={{ color: '#1a0dab', fontFamily: 'arial,sans-serif' }}>
        {t.length > 70 ? t.slice(0, 67) + '…' : t}
      </p>
      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#4d5156', fontFamily: 'arial,sans-serif' }}>
        {d.length > 165 ? d.slice(0, 162) + '…' : d}
      </p>
    </div>
  )
}

export function MetaField({
  label, value, field, onSave, multiline, rows,
}: {
  label: string; value: string; field: keyof typeof SEO_LIMITS
  onSave: (v: string) => Promise<{ success: boolean; error?: string; message?: string }>
  multiline?: boolean; rows?: number
}) {
  const [live, setLive] = useState(value)
  useEffect(() => setLive(value), [value])
  return (
    <div>
      <Field label={label} value={live} multiline={multiline} rows={rows}
        onSave={async (v) => { setLive(v); return onSave(v) }} />
      <CharCounter value={live} field={field} />
    </div>
  )
}

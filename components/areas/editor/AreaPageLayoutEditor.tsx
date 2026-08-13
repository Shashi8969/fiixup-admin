'use client'
// components/areas/editor/AreaPageLayoutEditor.tsx
// Same chevron up/down reorder UI as components/location-services/editor/
// PageLayoutEditor.tsx, adapted for the area hub's 7 reorderable sections.
// Must match the section ids in fiixup_nextjs's lib/areaPageSections.ts —
// the two repos don't share a package, so this list is kept in sync by hand
// (same duplication PageLayoutEditor.tsx already has with
// locationServicePageSections.ts).

import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react'
import { Toggle } from '@/components/location-services/editor/shared'

export type PageLayoutRow = { id: string; visible: boolean; heading: string | null }

const SECTION_REGISTRY: { id: string; label: string; headingHint: string; noHeading?: boolean }[] = [
  { id: 'trust_marquee',  label: 'Trust Marquee',   headingHint: '(scrolling strip — no heading)', noHeading: true },
  { id: 'services',       label: 'Services',        headingHint: 'Services available in {Area}' },
  { id: 'about',          label: 'About',           headingHint: '(uses the About tab’s own Heading field — no override here)', noHeading: true },
  { id: 'testimonials',   label: 'Testimonials',    headingHint: 'What {Area} Customers Say' },
  { id: 'seo_content',    label: 'SEO Content',     headingHint: '(uses SEO Content tab’s own headings — no override here)', noHeading: true },
  { id: 'faqs',           label: 'FAQs',            headingHint: 'Frequently Asked — {Area}' },
  { id: 'related_posts',  label: 'Related Posts',   headingHint: 'Helpful Guides for {Area} Vehicle Owners' },
]

function seedRows(value: PageLayoutRow[]): PageLayoutRow[] {
  if (value.length) {
    const known = new Set(value.map(r => r.id))
    const missing = SECTION_REGISTRY.filter(s => !known.has(s.id)).map(s => ({ id: s.id, visible: true, heading: null }))
    return [...value, ...missing]
  }
  return SECTION_REGISTRY.map(s => ({ id: s.id, visible: true, heading: null }))
}

export function AreaPageLayoutEditor({ value, onSave, saving }: {
  value: PageLayoutRow[]
  onSave: (rows: PageLayoutRow[]) => void
  saving: boolean
}) {
  const [rows, setRows] = useState<PageLayoutRow[]>(() => seedRows(value))

  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir
    if (t < 0 || t >= rows.length) return
    const n = [...rows]
    ;[n[i], n[t]] = [n[t], n[i]]
    setRows(n)
  }
  const setVisible = (i: number, v: boolean) => { const n = [...rows]; n[i] = { ...n[i], visible: v }; setRows(n) }
  const setHeading = (i: number, v: string) => { const n = [...rows]; n[i] = { ...n[i], heading: v || null }; setRows(n) }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#6b7280] leading-relaxed">
        Controls the order, visibility, and heading text of the sections between the Hero and the final Contact CTA
        on this area&apos;s live frontend. Breadcrumb, Hero, the closing Contact CTA, and the footer always stay
        fixed — everything else here can be reordered, hidden, or given a custom heading. Leaving a heading blank
        keeps the site&apos;s default.
      </p>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const meta = SECTION_REGISTRY.find(s => s.id === row.id)
          return (
            <div key={row.id} className="admin-card border border-[#2a2d3e] p-3 flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
                <GripVertical className="w-3.5 h-3.5 text-[#3a3d4e]" />
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === rows.length - 1}
                  className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-[#e2e8f0]">{meta?.label ?? row.id}</span>
                  <Toggle value={row.visible} onChange={(v) => setVisible(i, v)} label="Visible" />
                </div>
                {!meta?.noHeading && (
                  <input
                    className="admin-input w-full text-sm"
                    value={row.heading ?? ''}
                    onChange={(e) => setHeading(i, e.target.value)}
                    placeholder={`Default: "${meta?.headingHint ?? ''}"`}
                  />
                )}
                {meta?.noHeading && (
                  <p className="text-xs text-[#6b7280] italic">{meta?.headingHint}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={() => onSave(rows)} disabled={saving} className="admin-btn-primary text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Page Layout
        </button>
      </div>
    </div>
  )
}

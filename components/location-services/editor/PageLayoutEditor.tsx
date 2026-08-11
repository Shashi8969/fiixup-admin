'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react'
import { Toggle } from '@/components/location-services/editor/shared'

export type PageLayoutRow = { id: string; visible: boolean; heading: string | null }

// Must match the section ids in fiixup_nextjs's lib/locationServicePageSections.ts —
// the two repos don't share a package, so this list is kept in sync by hand.
const SECTION_REGISTRY: { id: string; label: string; headingHint: string }[] = [
  { id: 'why_choose',       label: 'Why Choose Us',    headingHint: 'Why Choose Fiixup in {Area}?' },
  { id: 'how_it_works',     label: 'How It Works',     headingHint: 'How Doorstep {Service} Works' },
  { id: 'seo_content',      label: 'SEO Content',      headingHint: '(uses SEO Content tab’s own headings — no override here)' },
  { id: 'pricing',          label: 'Pricing',          headingHint: '{Service} Cost' },
  { id: 'testimonials',     label: 'Testimonials',     headingHint: 'What {Area} Customers Say' },
  { id: 'faqs',             label: 'FAQs',             headingHint: '{Service} — FAQs' },
  { id: 'nearby_areas',     label: 'Nearby Areas',     headingHint: '{Service} in Nearby Areas' },
  { id: 'related_services', label: 'Related Services', headingHint: 'Other Services in {Area}' },
]

function seedRows(value: PageLayoutRow[]): PageLayoutRow[] {
  if (value.length) {
    // Forward-compatible: any registry section missing from saved data (e.g. a
    // new section type added to the site after this row was last saved) is
    // appended at the end, visible by default, so nothing silently disappears.
    const known = new Set(value.map(r => r.id))
    const missing = SECTION_REGISTRY.filter(s => !known.has(s.id)).map(s => ({ id: s.id, visible: true, heading: null }))
    return [...value, ...missing]
  }
  return SECTION_REGISTRY.map(s => ({ id: s.id, visible: true, heading: null }))
}

export function PageLayoutEditor({ value, onSave, saving }: {
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
        Controls the order, visibility, and heading text of the sections between About and the final CTA
        on this page&apos;s live frontend. Hero, Trust Strip, About, and the closing CTA always stay fixed —
        everything else here can be reordered, hidden, or given a custom heading. Leaving a heading blank
        keeps the site&apos;s default (auto-built from the service name and area).
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
                {row.id !== 'seo_content' && (
                  <input
                    className="admin-input w-full text-sm"
                    value={row.heading ?? ''}
                    onChange={(e) => setHeading(i, e.target.value)}
                    placeholder={`Default: "${meta?.headingHint ?? ''}"`}
                  />
                )}
                {row.id === 'seo_content' && (
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

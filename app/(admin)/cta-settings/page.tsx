'use client'
// app/(admin)/cta-settings/page.tsx
// Controls visibility of the floating Call/WhatsApp buttons on the public
// site, per page-type and per device (desktop/mobile). Writes directly to
// cta_visibility_settings — read at request time by the public site via
// lib/cta-settings.ts (unstable_cache, tag "cta-settings"), so changes here
// take effect within that cache window, not instantly.

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { revalidateCtaSettings } from '@/lib/actions'
import { showToast } from '@/components/ui/Toast'
import { PhoneCall, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

type Row = {
  id: string
  page_type: string
  button_type: 'call' | 'whatsapp'
  show_desktop: boolean
  show_mobile: boolean
}

const PAGE_TYPES: { id: string; label: string; hint: string }[] = [
  { id: 'home',              label: 'Homepage',             hint: '/' },
  { id: 'city',               label: 'City Pages',            hint: '/[city]' },
  { id: 'area',                label: 'Area Pages',             hint: '/[city]/[area]' },
  { id: 'location_service',    label: 'Location Service Pages', hint: '/[city]/[area]/[service]' },
  { id: 'city_service',        label: 'City Service Pages',     hint: '/[city]/services/[service]' },
  { id: 'global_service',      label: 'Global Service Pages',   hint: '/services/[service]' },
  { id: 'blog',                 label: 'Blog',                    hint: '/blog, /blog/[post]' },
  { id: 'brand',                label: 'Brand Pages',            hint: '/brands, /brands/[brand]' },
  { id: 'static',               label: 'Static Pages',           hint: 'About, Contact, FAQ, Gallery, etc.' },
]

function Toggle({ value, onChange, busy }: { value: boolean; onChange: () => void; busy: boolean }) {
  return (
    <button onClick={onChange} disabled={busy}
      className={clsx('relative w-9 h-5 rounded-full transition-colors flex-shrink-0 disabled:opacity-50',
        value ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
      <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

export default function CtaSettingsPage() {
  const sb = getBrowserClient()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('cta_visibility_settings').select('*')
    setRows((data ?? []) as Row[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggle = async (row: Row, field: 'show_desktop' | 'show_mobile') => {
    setSavingId(row.id)
    const nextVal = !row[field]
    const { error } = await sb.from('cta_visibility_settings')
      .update({ [field]: nextVal, updated_at: new Date().toISOString() }).eq('id', row.id)
    if (error) { setSavingId(null); showToast('error', error.message); return }
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, [field]: nextVal } : r))
    const revalidate = await revalidateCtaSettings()
    setSavingId(null)
    showToast('success', revalidate.success ? 'Saved and live cache cleared.' : 'Saved. Live site may update within 1 hour.')
  }

  const cell = (pageType: string, buttonType: 'call' | 'whatsapp') =>
    rows.find(r => r.page_type === pageType && r.button_type === buttonType)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <PhoneCall className="w-6 h-6 text-green-400" />
          Floating Buttons
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">
          Control whether the floating Call and WhatsApp buttons appear on each page type, separately for desktop
          and mobile. Everything defaults to visible everywhere — turn a switch off to hide it.
        </p>
      </div>

      <div className="admin-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3e] text-left">
              <th className="px-4 py-3 text-[#94a3b8] font-medium">Page Type</th>
              <th className="px-3 py-3 text-[#94a3b8] font-medium text-center" colSpan={2}>Call</th>
              <th className="px-3 py-3 text-[#94a3b8] font-medium text-center" colSpan={2}>WhatsApp</th>
            </tr>
            <tr className="border-b border-[#2a2d3e] text-left">
              <th className="px-4 pb-2"></th>
              <th className="px-3 pb-2 text-xs text-[#6b7280] font-normal text-center">Desktop</th>
              <th className="px-3 pb-2 text-xs text-[#6b7280] font-normal text-center">Mobile</th>
              <th className="px-3 pb-2 text-xs text-[#6b7280] font-normal text-center">Desktop</th>
              <th className="px-3 pb-2 text-xs text-[#6b7280] font-normal text-center">Mobile</th>
            </tr>
          </thead>
          <tbody>
            {PAGE_TYPES.map(pt => {
              const call = cell(pt.id, 'call')
              const wa   = cell(pt.id, 'whatsapp')
              return (
                <tr key={pt.id} className="border-b border-[#2a2d3e] last:border-0 hover:bg-[#1e2133] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#e2e8f0] font-medium">{pt.label}</p>
                    <p className="text-xs text-[#6b7280] font-mono mt-0.5">{pt.hint}</p>
                  </td>
                  <td className="px-3 py-3"><div className="flex justify-center">
                    {call && <Toggle value={call.show_desktop} busy={savingId === call.id} onChange={() => toggle(call, 'show_desktop')} />}
                  </div></td>
                  <td className="px-3 py-3"><div className="flex justify-center">
                    {call && <Toggle value={call.show_mobile} busy={savingId === call.id} onChange={() => toggle(call, 'show_mobile')} />}
                  </div></td>
                  <td className="px-3 py-3"><div className="flex justify-center">
                    {wa && <Toggle value={wa.show_desktop} busy={savingId === wa.id} onChange={() => toggle(wa, 'show_desktop')} />}
                  </div></td>
                  <td className="px-3 py-3"><div className="flex justify-center">
                    {wa && <Toggle value={wa.show_mobile} busy={savingId === wa.id} onChange={() => toggle(wa, 'show_mobile')} />}
                  </div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#6b7280]">
        Note: the area-page mobile sticky call bar is a separate, always-mobile-only component by design (desktop
        already shows an inline call button in the hero there) — these switches control only the two floating
        corner buttons.
      </p>
    </div>
  )
}

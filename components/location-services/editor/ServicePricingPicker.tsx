'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, IndianRupee, Loader2, Plus, RefreshCw, Search, Sparkles } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

type Row = Record<string, unknown>

function s(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

// Multi-select "add a linked service" picker — a page can link several
// canonical services at once (e.g. a roadside-assistance page pulling in
// both "Jumpstart" and "Towing" pricing), on top of its own manual rows.
// Unlike the single-select version this replaced, picking a service here
// adds another link rather than swapping the existing one.
export function ServicePricingPicker({
  linkedIds,
  onAdd,
}: {
  linkedIds: string[]
  onAdd: (pricingId: string) => Promise<void>
}) {
  const sb = getBrowserClient()
  const [library, setLibrary] = useState<Row[]>([])
  const [rowMeta, setRowMeta] = useState<Record<string, { count: number; popular: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: services, error: svcErr }, { data: rows, error: rowErr }] = await Promise.all([
      sb.from('service_pricing').select('*').order('service_name'),
      sb.from('service_pricing_rows').select('service_pricing_id, highlight'),
    ])
    setLoading(false)

    if (svcErr || rowErr) {
      showToast('error', (svcErr || rowErr)!.message)
      return
    }
    setLibrary((services ?? []) as Row[])

    const meta: Record<string, { count: number; popular: boolean }> = {}
    for (const row of rows ?? []) {
      const id = s(row.service_pricing_id)
      if (!meta[id]) meta[id] = { count: 0, popular: false }
      meta[id].count += 1
      if (row.highlight) meta[id].popular = true
    }
    setRowMeta(meta)
  }

  useEffect(() => {
    load()
  }, [])

  const linkedSet = useMemo(() => new Set(linkedIds), [linkedIds])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return library
    return library.filter((row) =>
      [s(row.service_name), s(row.service_slug)].join(' ').toLowerCase().includes(term),
    )
  }, [library, query])

  const add = async (pricingId: string) => {
    setLinkingId(pricingId)
    await onAdd(pricingId)
    setLinkingId(null)
  }

  return (
    <div className="admin-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-green-400" /> Link Another Service
          </h3>
          <p className="text-xs text-[#6b7280] mt-1">
            Link one or more canonical services — their price rows all show on this page. Editing a price
            later on the Price Table page updates every linked page automatically.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="admin-btn-secondary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the price table…"
          className="admin-input pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#6b7280] italic py-3">
          No matching entries. Add the service on the Price Table page first, then link it here.
        </p>
      ) : (
        <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((row) => {
            const rowId = s(row.id)
            const isLinked = linkedSet.has(rowId)
            const meta = rowMeta[rowId] ?? { count: 0, popular: false }
            return (
              <div
                key={rowId}
                className={
                  isLinked
                    ? 'flex items-center justify-between gap-4 rounded-xl border border-green-500/30 bg-green-500/5 p-4'
                    : 'flex items-center justify-between gap-4 rounded-xl border border-[#2a2d3e] bg-[#11131c] p-4'
                }
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white truncate">{s(row.service_name, s(row.service_slug))}</p>
                    {meta.popular && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Sparkles className="w-2.5 h-2.5" /> Popular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">
                    {s(row.service_slug)} · {meta.count} price row{meta.count === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={() => add(rowId)}
                  disabled={isLinked || linkingId === rowId}
                  className={isLinked ? 'admin-btn-secondary flex-shrink-0 opacity-60' : 'admin-btn-primary flex-shrink-0'}
                >
                  {linkingId === rowId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isLinked ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {isLinked ? 'Linked' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

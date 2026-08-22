'use client'
// app/(admin)/price-table/page.tsx
// Canonical price table — one row per real-world service. Editing a price
// here updates every location_services page linked to it (via
// location_service_pricing_links) the next time its seo_pages cache
// rebuilds, which happens automatically on save.

import { useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import {
  IndianRupee, Loader2, Plus, Search, ChevronDown, ChevronRight,
  Link2, Sparkles, Layers, ListChecks,
} from 'lucide-react'
import {
  AddBtn,
  ChildRow,
  Empty,
  SectionHeader,
  s,
} from '@/components/location-services/editor/LocationServiceEditorParts'

type Row = Record<string, unknown>

function formatRange(rows: Row[]): string {
  if (rows.length === 0) return '—'
  const lows = rows.map((r) => Number(r.price_from) || 0)
  const highs = rows.map((r) => Number(r.price_to ?? r.price_from) || 0)
  const min = Math.min(...lows)
  const max = Math.max(...highs)
  return min === max ? `₹${min.toLocaleString('en-IN')}` : `₹${min.toLocaleString('en-IN')}–₹${max.toLocaleString('en-IN')}`
}

export default function PriceTablePage() {
  const sb = getBrowserClient()
  const [services, setServices] = useState<Row[]>([])
  const [rowsByService, setRowsByService] = useState<Record<string, Row[]>>({})
  const [linkCounts, setLinkCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const [{ data: svc, error: svcErr }, { data: rows, error: rowErr }, { data: links, error: linkErr }] =
      await Promise.all([
        sb.from('service_pricing').select('*').order('service_name'),
        sb.from('service_pricing_rows').select('*').order('sort_order'),
        sb.from('location_service_pricing_links').select('service_pricing_id'),
      ])
    setLoading(false)

    if (svcErr || rowErr || linkErr) {
      showToast('error', (svcErr || rowErr || linkErr)!.message)
      return
    }

    setServices((svc ?? []) as Row[])

    const grouped: Record<string, Row[]> = {}
    for (const row of (rows ?? []) as Row[]) {
      const key = s(row.service_pricing_id)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row)
    }
    setRowsByService(grouped)

    const counts: Record<string, number> = {}
    for (const link of (links ?? []) as Row[]) {
      const key = s(link.service_pricing_id)
      counts[key] = (counts[key] ?? 0) + 1
    }
    setLinkCounts(counts)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return services
    return services.filter((row) =>
      [s(row.service_name), s(row.service_slug)].join(' ').toLowerCase().includes(term),
    )
  }, [services, search])

  const totals = useMemo(() => {
    const totalRows = Object.values(rowsByService).reduce((sum, rows) => sum + rows.length, 0)
    const totalLinks = Object.values(linkCounts).reduce((sum, count) => sum + count, 0)
    const popularCount = Object.values(rowsByService)
      .flat()
      .filter((row) => Boolean(row.highlight)).length
    return { services: services.length, rows: totalRows, links: totalLinks, popular: popularCount }
  }, [services, rowsByService, linkCounts])

  const createService = async () => {
    const slug = newSlug.trim()
    const name = newName.trim()
    if (!slug || !name) { showToast('error', 'Slug and name are required'); return }
    setCreating(true)
    const { error } = await sb.from('service_pricing').insert({ service_slug: slug, service_name: name })
    setCreating(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Service added — now add its price rows')
    setNewSlug(''); setNewName(''); setShowCreate(false)
    await load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <IndianRupee className="w-6 h-6 text-green-400" /> Price Table
        </h1>
        <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
          The single source of truth for service pricing. Location pages link here instead of typing their
          own prices — edit once, every linked page updates automatically.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="admin-card p-4">
          <p className="text-2xl font-bold text-white">{totals.services}</p>
          <p className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1"><Layers className="w-3 h-3" /> Services</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-2xl font-bold text-white">{totals.rows}</p>
          <p className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1"><ListChecks className="w-3 h-3" /> Price Rows</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-2xl font-bold text-blue-300">{totals.links}</p>
          <p className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1"><Link2 className="w-3 h-3" /> Pages Linked</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-2xl font-bold text-amber-300">{totals.popular}</p>
          <p className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Popular Rows</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search services…"
            className="admin-input pl-9"
          />
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="admin-btn-primary">
          <Plus className="w-4 h-4" /> New Service
        </button>
      </div>

      {showCreate && (
        <div className="admin-card p-4 space-y-3 border-dashed">
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">New Canonical Service</p>
          <div>
            <label className="admin-label">Service Slug *</label>
            <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="e.g. car-jumpstart-near-me" className="admin-input" />
          </div>
          <div>
            <label className="admin-label">Service Name *</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Car Jumpstart Service" className="admin-input" />
          </div>
          <div className="flex gap-2">
            <button onClick={createService} disabled={creating} className="admin-btn-primary">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty>No services found.</Empty>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((service) => {
            const id = s(service.id)
            const rows = rowsByService[id] ?? []
            const links = linkCounts[id] ?? 0
            const hasPopular = rows.some((row) => Boolean(row.highlight))
            const isOpen = expanded === id
            return (
              <div
                key={id}
                className={
                  isOpen
                    ? 'admin-card overflow-hidden border-blue-500/40 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]'
                    : 'admin-card overflow-hidden transition-colors hover:border-[#3a3d4e]'
                }
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#1e2133] transition-colors text-left"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-white truncate">{s(service.service_name)}</p>
                      {hasPopular && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <Sparkles className="w-2.5 h-2.5" /> Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {s(service.service_slug)} · {rows.length} row{rows.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-300 flex-shrink-0 tabular-nums">{formatRange(rows)}</p>
                  {links > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border text-blue-300 bg-blue-400/10 border-blue-400/20 flex-shrink-0">
                      <Link2 className="w-3 h-3" /> {links}
                    </span>
                  )}
                  {isOpen ? <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#2a2d3e] pt-4 space-y-3 bg-[#0d0f18]">
                    <SectionHeader title="Price Rows" count={rows.length}>
                      <AddBtn table="service_pricing_rows" parentKey="service_pricing_id" parentId={id}
                        fields={[
                          { key: 'label',      label: 'Label',          type: 'text',    required: true },
                          { key: 'price_from', label: 'Price From (₹)', type: 'number',  required: true },
                          { key: 'price_to',   label: 'Price To (₹)',   type: 'number'  },
                          { key: 'note',       label: 'Note',           type: 'text'    },
                          { key: 'highlight',  label: 'Popular',        type: 'boolean' },
                          { key: 'sort_order', label: 'Sort Order',     type: 'number'  },
                        ]}
                        onAdded={load}
                      />
                    </SectionHeader>
                    {rows.length === 0 && <Empty>No price rows yet. Add one above.</Empty>}
                    {rows.map((row) => (
                      <ChildRow key={s(row.id)} row={row} table="service_pricing_rows"
                        preview={`${row.highlight ? '✨ ' : ''}${s(row.label)} — ₹${s(row.price_from)}${row.price_to ? `–₹${s(row.price_to)}` : '+'}`}
                        fields={[
                          { key: 'label',      label: 'Label',          type: 'text'   },
                          { key: 'price_from', label: 'Price From (₹)', type: 'number' },
                          { key: 'price_to',   label: 'Price To (₹)',   type: 'number' },
                          { key: 'note',       label: 'Note',           type: 'textarea'},
                          { key: 'highlight',  label: 'Popular',         type: 'boolean'},
                          { key: 'sort_order', label: 'Sort Order',     type: 'number' },
                        ]}
                        onSave={load}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

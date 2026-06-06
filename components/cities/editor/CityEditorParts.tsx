'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { ChevronDown, ChevronRight, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

type City        = Record<string, unknown>
type Area        = Record<string, unknown>
type Highlight   = Record<string, unknown>
type Testimonial = Record<string, unknown>
type Faq         = Record<string, unknown>
type CSP         = Record<string, unknown>

export function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

// ── Small UI helpers ───────────────────────────────────────────────────────────
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="admin-section-title mb-1">{children}</h2>
}
export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="ml-1.5 text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full font-normal">{children}</span>
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6b7280] text-sm italic py-3">{children}</p>
}

// ── JSON textarea editor ───────────────────────────────────────────────────────
export function JsonField({ label, value, onSave }: {
  label: string
  value: unknown
  onSave: (v: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [text, setText]   = useState(JSON.stringify(value ?? [], null, 2))
  const [err,  setErr]    = useState('')
  const [busy, setBusy]   = useState(false)

  const handleSave = async () => {
    try { JSON.parse(text); setErr('') }
    catch { setErr('Invalid JSON'); return }
    setBusy(true)
    const r = await onSave(text)
    setBusy(false)
    if (!r.success) setErr(r.error ?? 'Error')
  }

  return (
    <div className="space-y-1.5">
      <label className="admin-label">{label}</label>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={6} className="admin-textarea font-mono text-xs" spellCheck={false} />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button onClick={handleSave} disabled={busy} className="admin-btn-primary">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save JSON
      </button>
    </div>
  )
}

// ── Area row (inline edit) ────────────────────────────────────────────────────
export function AreaRow({ area, onSave }: { area: Area; onSave: () => void }) {
  const sb = getBrowserClient()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    name:       String(area.name ?? ''),
    slug:       String(area.slug ?? ''),
    highlight:  String(area.highlight ?? ''),
    sort_order: String(area.sort_order ?? '0'),
    latitude:   String(area.latitude ?? ''),
    longitude:  String(area.longitude ?? ''),
    is_active:  Boolean(area.is_active ?? true),
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await sb.from('areas').update({
      name:      form.name,
      slug:      form.slug,
      highlight: form.highlight,
      sort_order:parseInt(form.sort_order) || 0,
      latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', area.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', `Area "${form.name}" saved`)
    onSave()
    setExpanded(false)
  }

  const del = async () => {
    if (!confirm(`Delete area "${form.name}"?`)) return
    const { error } = await sb.from('areas').delete().eq('id', area.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Area deleted')
    onSave()
  }

  return (
    <div className="admin-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="font-semibold text-[#e2e8f0] text-sm">{form.name}</span>
          <span className="text-xs text-[#6b7280]">/{form.slug}</span>
          {!form.is_active && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
        </div>
        <span className="text-xs text-[#6b7280] flex-shrink-0">Sort: {form.sort_order}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Name"  value={form.name}  onChange={v => setForm(p=>({...p,name:v}))} />
            <Inp label="Slug"  value={form.slug}  onChange={v => setForm(p=>({...p,slug:v}))} />
          </div>
          <Inp label="Highlight text" value={form.highlight} onChange={v => setForm(p=>({...p,highlight:v}))} />
          <div className="grid grid-cols-3 gap-3">
            <Inp label="Sort Order" value={form.sort_order} onChange={v => setForm(p=>({...p,sort_order:v}))} />
            <Inp label="Latitude"   value={form.latitude}   onChange={v => setForm(p=>({...p,latitude:v}))} />
            <Inp label="Longitude"  value={form.longitude}  onChange={v => setForm(p=>({...p,longitude:v}))} />
          </div>
          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="admin-label mb-0">Active</label>
            <button onClick={() => setForm(p=>({...p,is_active:!p.is_active}))}
              className={clsx('relative w-10 h-5 rounded-full transition-colors',
                form.is_active ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
              <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                form.is_active ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Area
            </button>
            <button onClick={del} className="admin-btn-danger">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Area button ────────────────────────────────────────────────────────────
export function AddAreaButton({ cityId, citySlug, onAdded }: { cityId: string; citySlug: string; onAdded: () => void }) {
  const sb = getBrowserClient()
  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState({ name: '', slug: '', highlight: '', sort_order: '0' })
  const [busy, setBusy]   = useState(false)

  const add = async () => {
    if (!form.name || !form.slug) { showToast('error', 'Name and slug required'); return }
    setBusy(true)
    const { error } = await sb.from('areas').insert({
      city_id:    cityId,
      city_slug:  citySlug,
      name:       form.name,
      slug:       form.slug,
      highlight:  form.highlight,
      sort_order: parseInt(form.sort_order) || 0,
      is_active:  true,
    })
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Area added')
    setForm({ name: '', slug: '', highlight: '', sort_order: '0' })
    setOpen(false)
    onAdded()
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="admin-btn-primary">
        <Plus className="w-4 h-4" /> Add Area
      </button>
      {open && (
        <div className="admin-card p-4 mt-3 space-y-3 border-dashed">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Name *"  value={form.name}  onChange={v => setForm(p=>({...p,name:v}))} placeholder="Koramangala" />
            <Inp label="Slug *"  value={form.slug}  onChange={v => setForm(p=>({...p,slug:v}))} placeholder="koramangala" />
          </div>
          <Inp label="Highlight" value={form.highlight} onChange={v => setForm(p=>({...p,highlight:v}))} placeholder="IT Hub" />
          <Inp label="Sort Order" value={form.sort_order} onChange={v => setForm(p=>({...p,sort_order:v}))} />
          <button onClick={add} disabled={busy} className="admin-btn-primary">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Area
          </button>
        </div>
      )}
    </div>
  )
}

// ── Generic editable row (highlights, testimonials, faqs) ────────────────────
export function EditableRow({ row, table, fields, onSave }: {
  row: Record<string, unknown>
  table: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' }[]
  onSave: () => void
}) {
  const sb = getBrowserClient()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, String(row[f.key] ?? '')]))
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const payload: Record<string, unknown> = {}
    fields.forEach(f => {
      payload[f.key] = f.type === 'number' ? (parseFloat(form[f.key]) || 0) : form[f.key]
    })
    const { error } = await sb.from(table).update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Saved')
    onSave()
  }

  const del = async () => {
    if (!confirm('Delete this row?')) return
    const { error } = await sb.from(table).delete().eq('id', row.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Deleted')
    onSave()
  }

  const preview = fields.find(f => f.key === 'title' || f.key === 'name' || f.key === 'question')
  const previewVal = preview ? String(row[preview.key] ?? '').slice(0, 60) : String(row.id).slice(0, 8)

  return (
    <div className="admin-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-[#6b7280]" /> : <ChevronRight className="w-4 h-4 text-[#6b7280]" />}
        <span className="flex-1 text-sm text-[#e2e8f0] truncate">{previewVal}</span>
        <span className="text-xs text-[#6b7280]">Sort: {String(row.sort_order ?? 0)}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          {fields.map(f => (
            f.type === 'textarea'
              ? <div key={f.key}><label className="admin-label">{f.label}</label>
                  <textarea value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                    rows={4} className="admin-textarea" /></div>
              : <Inp key={f.key} label={f.label} value={form[f.key]} onChange={v => setForm(p=>({...p,[f.key]:v}))} />
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={del} className="admin-btn-danger"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Row button (generic) ───────────────────────────────────────────────────
export function AddRowButton({ table, parentKey, parentId, fields, onAdded }: {
  table: string
  parentKey: string
  parentId: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' }[]
  onAdded: () => void
}) {
  const sb = getBrowserClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, '']))
  )
  const [busy, setBusy] = useState(false)

  const add = async () => {
    setBusy(true)
    const payload: Record<string, unknown> = { [parentKey]: parentId }
    fields.forEach(f => {
      payload[f.key] = f.type === 'number' ? (parseFloat(form[f.key]) || 0) : form[f.key]
    })
    const { error } = await sb.from(table).insert(payload)
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Added')
    setForm(Object.fromEntries(fields.map(f => [f.key, ''])))
    setOpen(false)
    onAdded()
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="admin-btn-primary">
        <Plus className="w-4 h-4" /> Add
      </button>
      {open && (
        <div className="admin-card p-4 mt-3 space-y-3 border-dashed">
          {fields.map(f => (
            f.type === 'textarea'
              ? <div key={f.key}><label className="admin-label">{f.label}</label>
                  <textarea value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                    rows={3} className="admin-textarea" /></div>
              : <Inp key={f.key} label={f.label} value={form[f.key]} onChange={v => setForm(p=>({...p,[f.key]:v}))} />
          ))}
          <button onClick={add} disabled={busy} className="admin-btn-primary">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ── CSP Card — links to city-service-pages/[id] editor ────────────────────────
export function CSPCard({ csp, citySlug, onSave }: { csp: CSP; citySlug: string; onSave: () => void }) {
  const cat = csp.service_categories as Record<string,unknown> | null
  return (
    <Link href={`/city-service-pages/${csp.id}`}
      className="admin-card flex items-center gap-4 px-5 py-4 hover:border-blue-500/30 transition-all group">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#e2e8f0] text-sm group-hover:text-blue-300 transition-colors">
          {String(cat?.title ?? csp.category_slug)}
        </p>
        <p className="text-xs text-[#6b7280] truncate mt-0.5">
          /{citySlug}/services/{String(csp.category_slug)}
        </p>
        <p className="text-xs text-[#6b7280] mt-1 truncate">
          {String(csp.hero_heading ?? '').slice(0,80) || '— no hero heading yet'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!csp.is_active && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
        <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-blue-400 transition-colors" />
      </div>
    </Link>
  )
}

// ── Tiny input component ───────────────────────────────────────────────────────
export function Inp({ label, value, onChange, placeholder }: {
  label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="admin-input" />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { ChevronDown, ChevronRight, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

type Row = Record<string, unknown>

export function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6b7280] text-sm italic py-3 px-1">{children}</p>
}
export function SectionHeader({ title, count, children }: {
  title: string; count: number; children: React.ReactNode
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
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(!value)}
        className={clsx('relative w-8 h-4 rounded-full transition-colors',
          value ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
        <span className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      <span className="text-xs text-[#6b7280]">{label}</span>
    </div>
  )
}

// ── JSON field editor ──────────────────────────────────────────────────────────
export function JsonField({ label, hint, value, onSave }: {
  label: string; hint: string; value: unknown
  onSave: (v: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [text, setText] = useState(JSON.stringify(value ?? [], null, 2))
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
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
      <p className="text-xs text-[#475569] font-mono mb-1">Format: {hint}</p>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={7} className="admin-textarea font-mono text-xs" spellCheck={false} />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button onClick={save} disabled={busy} className="admin-btn-primary">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save JSON
      </button>
    </div>
  )
}

// ── Expandable child row (uses Server Actions) ─────────────────────────────────
export function ChildRow({ row, preview, fields, onSave, onDelete }: {
  row: Row; preview: string
  fields: { key: string; label: string; type: 'text'|'textarea'|'number'|'boolean' }[]
  onSave:   (id: string, data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>
  onDelete: (id: string) => Promise<{ success: boolean; error?: string; message?: string }>
}) {
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, f.type === 'boolean' ? String(Boolean(row[f.key])) : s(row[f.key])]))
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const payload: Record<string, unknown> = {}
    fields.forEach(f => {
      if (f.type === 'number')  payload[f.key] = parseFloat(form[f.key]) || 0
      else if (f.type === 'boolean') payload[f.key] = form[f.key] === 'true'
      else payload[f.key] = form[f.key]
    })
    await onSave(s(row.id), payload)
    setSaving(false)
    setOpen(false)
  }

  const del = async () => {
    if (!confirm('Delete this row?')) return
    await onDelete(s(row.id))
  }

  return (
    <div className="admin-card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {open ? <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
               : <ChevronRight className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
        <span className="flex-1 text-sm text-[#e2e8f0] truncate">{preview}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          {fields.map(f => (
            f.type === 'textarea' ? (
              <div key={f.key}>
                <label className="admin-label">{f.label}</label>
                <textarea value={form[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}
                  rows={4} className="admin-textarea" />
              </div>
            ) : f.type === 'boolean' ? (
              <div key={f.key} className="flex items-center gap-3">
                <span className="admin-label mb-0">{f.label}</span>
                <Toggle value={form[f.key]==='true'} onChange={v=>setForm(p=>({...p,[f.key]:String(v)}))} label="" />
              </div>
            ) : (
              <div key={f.key}>
                <label className="admin-label">{f.label}</label>
                <input type={f.type === 'number' ? 'number' : 'text'} value={form[f.key]}
                  onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))} className="admin-input" />
              </div>
            )
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={del} className="admin-btn-danger"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add button using Server Actions ────────────────────────────────────────────
export function AddRowBtn({ fields, onAdd }: {
  fields: { key: string; label: string; type: 'text'|'textarea'|'number'; required?: boolean }[]
  onAdd: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string,string>>(Object.fromEntries(fields.map(f=>[f.key,''])))
  const [busy, setBusy] = useState(false)
  const add = async () => {
    setBusy(true)
    const payload: Record<string,unknown> = {}
    fields.forEach(f => { payload[f.key] = f.type==='number' ? (parseFloat(form[f.key])||0) : form[f.key] })
    await onAdd(payload)
    setBusy(false)
    setForm(Object.fromEntries(fields.map(f=>[f.key,''])))
    setOpen(false)
  }
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="admin-btn-primary"><Plus className="w-4 h-4" /> Add</button>
      {open && (
        <div className="admin-card p-4 mt-3 space-y-3 border-dashed">
          {fields.map(f => f.type==='textarea'
            ? (<div key={f.key}><label className="admin-label">{f.label}{f.required&&' *'}</label>
                <textarea value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} rows={3} className="admin-textarea" /></div>)
            : (<div key={f.key}><label className="admin-label">{f.label}{f.required&&' *'}</label>
                <input type={f.type==='number'?'number':'text'} value={form[f.key]}
                  onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="admin-input" /></div>)
          )}
          <div className="flex gap-2">
            <button onClick={add} disabled={busy} className="admin-btn-primary">
              {busy?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Plus className="w-3.5 h-3.5"/>} Add Row
            </button>
            <button onClick={()=>setOpen(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Direct Supabase add (for csp_related_services — no server action needed) ───
export function DirectAddBtn({ table, parentKey, parentId, fields, onAdded }: {
  table: string; parentKey: string; parentId: string
  fields: { key: string; label: string; type: 'text'|'number'; required?: boolean }[]
  onAdded: () => void
}) {
  const sb = getBrowserClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string,string>>(Object.fromEntries(fields.map(f=>[f.key,''])))
  const [busy, setBusy] = useState(false)
  const add = async () => {
    setBusy(true)
    const payload: Record<string,unknown> = { [parentKey]: parentId }
    fields.forEach(f => { payload[f.key] = f.type==='number'?(parseFloat(form[f.key])||0):form[f.key] })
    const { error } = await sb.from(table).insert(payload)
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Added')
    setForm(Object.fromEntries(fields.map(f=>[f.key,''])))
    setOpen(false)
    onAdded()
  }
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="admin-btn-primary"><Plus className="w-4 h-4" /> Add</button>
      {open && (
        <div className="admin-card p-4 mt-3 space-y-3 border-dashed">
          {fields.map(f => (
            <div key={f.key}><label className="admin-label">{f.label}{f.required&&' *'}</label>
              <input type={f.type==='number'?'number':'text'} value={form[f.key]}
                onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="admin-input" /></div>
          ))}
          <div className="flex gap-2">
            <button onClick={add} disabled={busy} className="admin-btn-primary">
              {busy?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Plus className="w-3.5 h-3.5"/>} Add
            </button>
            <button onClick={()=>setOpen(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Direct Supabase child row (for csp_related_services) ──────────────────────
export function DirectChildRow({ row, table, preview, fields, onSave }: {
  row: Row; table: string; preview: string
  fields: { key: string; label: string; type: 'text'|'number' }[]
  onSave: () => void
}) {
  const sb = getBrowserClient()
  const [open,   setOpen]   = useState(false)
  const [form,   setForm]   = useState<Record<string,string>>(
    Object.fromEntries(fields.map(f=>[f.key, s(row[f.key])]))
  )
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    const payload: Record<string,unknown> = {}
    fields.forEach(f => { payload[f.key] = f.type==='number'?(parseFloat(form[f.key])||0):form[f.key] })
    const { error } = await sb.from(table).update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Saved'); onSave(); setOpen(false)
  }
  const del = async () => {
    if (!confirm('Delete?')) return
    const { error } = await sb.from(table).delete().eq('id', row.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Deleted'); onSave()
  }
  return (
    <div className="admin-card overflow-hidden">
      <button onClick={()=>setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {open?<ChevronDown className="w-4 h-4 text-[#6b7280]"/>:<ChevronRight className="w-4 h-4 text-[#6b7280]"/>}
        <span className="flex-1 text-sm text-[#e2e8f0] truncate">{preview}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          {fields.map(f=>(
            <div key={f.key}><label className="admin-label">{f.label}</label>
              <input type={f.type==='number'?'number':'text'} value={form[f.key]}
                onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="admin-input" /></div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>} Save
            </button>
            <button onClick={del} className="admin-btn-danger"><Trash2 className="w-3.5 h-3.5"/> Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}
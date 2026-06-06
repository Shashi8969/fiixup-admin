'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { ChevronDown, ChevronRight, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { s, Toggle } from './shared'

type Row = Record<string, unknown>

export function DelBtn({ table, id, onDeleted }: { table: string; id: string; onDeleted: () => void }) {
  const sb  = getBrowserClient()
  const [busy, setBusy] = useState(false)
  const del = async () => {
    if (!confirm('Delete this row?')) return
    setBusy(true)
    const { error } = await sb.from(table).delete().eq('id', id)
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Deleted')
    onDeleted()
  }
  return (
    <button onClick={del} disabled={busy} className="admin-btn-danger flex-shrink-0">
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Expandable child row (edit + delete) ───────────────────────────────────────
export function ChildRow({ row, table, preview, fields, onSave }: {
  row: Row; table: string; preview: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'boolean' }[]
  onSave: () => void
}) {
  const sb = getBrowserClient()
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
    const { error } = await sb.from(table).update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Saved')
    onSave()
    setOpen(false)
  }

  const del = async () => {
    if (!confirm('Delete this row?')) return
    const { error } = await sb.from(table).delete().eq('id', row.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Deleted')
    onSave()
  }

  return (
    <div className="admin-card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {open ? <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" />
               : <ChevronRight className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
        <span className="flex-1 text-sm text-[#e2e8f0] truncate">{preview}</span>
        <span className="text-xs text-[#475569] flex-shrink-0">#{s(row.id).slice(0,8)}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          {fields.map(f => (
            f.type === 'textarea' ? (
              <div key={f.key}>
                <label className="admin-label">{f.label}</label>
                <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  rows={4} className="admin-textarea" />
              </div>
            ) : f.type === 'boolean' ? (
              <div key={f.key} className="flex items-center gap-3">
                <span className="admin-label mb-0">{f.label}</span>
                <Toggle
                  value={form[f.key] === 'true'}
                  onChange={v => setForm(p => ({ ...p, [f.key]: String(v) }))}
                  label=""
                />
              </div>
            ) : (
              <div key={f.key}>
                <label className="admin-label">{f.label}</label>
                <input type={f.type === 'number' ? 'number' : 'text'}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="admin-input" />
              </div>
            )
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
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

// ── Add button (generic for any child table) ───────────────────────────────────
export function AddBtn({ table, parentKey, parentId, fields, onAdded }: {
  table: string; parentKey: string; parentId: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number'; required?: boolean }[]
  onAdded: () => void
}) {
  const sb = getBrowserClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, '']))
  )
  const [busy, setBusy] = useState(false)

  const add = async () => {
    const missing = fields.filter(f => f.required && !form[f.key].trim())
    if (missing.length) { showToast('error', `Required: ${missing.map(f => f.label).join(', ')}`); return }
    setBusy(true)
    const payload: Record<string, unknown> = { [parentKey]: parentKey === 'ls_id' ? parseInt(parentId) : parentId }
    fields.forEach(f => {
      if (!form[f.key] && !f.required) return
      payload[f.key] = f.type === 'number' ? (parseFloat(form[f.key]) || 0) : form[f.key]
    })
    const { error } = await sb.from(table).insert(payload)
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Added successfully')
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
          <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">New Row</p>
          {fields.map(f => (
            f.type === 'textarea' ? (
              <div key={f.key}>
                <label className="admin-label">{f.label}{f.required && ' *'}</label>
                <textarea value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  rows={3} className="admin-textarea" />
              </div>
            ) : (
              <div key={f.key}>
                <label className="admin-label">{f.label}{f.required && ' *'}</label>
                <input type={f.type === 'number' ? 'number' : 'text'}
                  value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.label} className="admin-input" />
              </div>
            )
          ))}
          <div className="flex gap-2">
            <button onClick={add} disabled={busy} className="admin-btn-primary">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Row
            </button>
            <button onClick={() => setOpen(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── JSON field editor ──────────────────────────────────────────────────────────

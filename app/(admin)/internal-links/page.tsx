'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { AlertTriangle, CheckCircle, ExternalLink, Link2, Loader2, Plus, RefreshCw, Save, Search, Trash2, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

type LinkOption = {
  href: string
  label: string
  target_type: string | null
  target_id: string | null
  city_slug: string | null
  area_slug: string | null
  service_slug: string | null
  service_category: string | null
  source_table: string | null
}

type OverrideRow = Record<string, unknown>

type FormState = {
  source_path: string
  section_key: 'related_services' | 'nearby_areas' | 'custom_links'
  label: string
  href: string
  link_mode: 'db_page' | 'manual'
  target_type: string
  target_id: string
  sort_order: string
  opens_new_tab: boolean
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  source_path: '',
  section_key: 'related_services',
  label: '',
  href: '',
  link_mode: 'db_page',
  target_type: '',
  target_id: '',
  sort_order: '100',
  opens_new_tab: false,
  is_active: true,
}

function s(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function b(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  return fallback
}

function normalizePath(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:|tel:|mailto:|#)/i.test(trimmed)) return trimmed
  if (trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`
}

function optionKey(option: LinkOption) {
  return `${option.target_type ?? 'manual'}::${option.target_id ?? option.href}::${option.href}`
}

function toForm(row: OverrideRow): FormState {
  return {
    source_path: s(row.source_path),
    section_key: (s(row.section_key, 'related_services') as FormState['section_key']),
    label: s(row.label),
    href: s(row.href),
    link_mode: s(row.link_mode, 'db_page') === 'manual' ? 'manual' : 'db_page',
    target_type: s(row.target_type),
    target_id: s(row.target_id),
    sort_order: String(row.sort_order ?? 100),
    opens_new_tab: b(row.opens_new_tab, false),
    is_active: b(row.is_active, true),
  }
}

function toPayload(form: FormState) {
  return {
    source_path: normalizePath(form.source_path),
    section_key: form.section_key,
    label: form.label.trim(),
    href: normalizePath(form.href),
    link_mode: form.link_mode,
    target_type: form.link_mode === 'db_page' ? form.target_type || null : null,
    target_id: form.link_mode === 'db_page' ? form.target_id || null : null,
    sort_order: Number(form.sort_order) || 100,
    opens_new_tab: Boolean(form.opens_new_tab),
    is_active: Boolean(form.is_active),
    updated_at: new Date().toISOString(),
  }
}

function badge(active: boolean) {
  return active ? 'bg-green-500/10 text-green-300 border-green-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
}

export default function InternalLinksPage() {
  const sb = getBrowserClient()
  const [rows, setRows] = useState<OverrideRow[]>([])
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newLink, setNewLink] = useState<FormState>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_FORM })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [rowsResult, optionsResult] = await Promise.all([
      sb.from('page_link_overrides').select('*').order('source_path').order('section_key').order('sort_order'),
      sb.from('cms_public_link_options').select('*').order('label'),
    ])
    setLoading(false)

    if (rowsResult.error) {
      showToast('error', rowsResult.error.message)
      setRows([])
    } else {
      setRows((rowsResult.data ?? []) as OverrideRow[])
    }
    setLinkOptions((optionsResult.data ?? []) as LinkOption[])
  }, [sb])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) => [s(row.source_path), s(row.section_key), s(row.label), s(row.href)].join(' ').toLowerCase().includes(term))
  }, [rows, query])

  const applyOption = (option: LinkOption, form: FormState, setForm: (next: FormState) => void) => {
    setForm({
      ...form,
      label: form.label || option.label,
      href: option.href,
      link_mode: 'db_page',
      target_type: option.target_type ?? '',
      target_id: option.target_id ?? '',
    })
  }

  const renderForm = (form: FormState, setForm: (next: FormState) => void) => {
    const selectedKey = form.target_type && form.target_id ? `${form.target_type}::${form.target_id}::${form.href}` : ''
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#94a3b8]">Source Page Path</span>
          <input value={form.source_path} onChange={(event) => setForm({ ...form, source_path: event.target.value })} placeholder="/bangalore/car-mechanic-near-me" className="admin-input" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#94a3b8]">Section</span>
          <select value={form.section_key} onChange={(event) => setForm({ ...form, section_key: event.target.value as FormState['section_key'] })} className="admin-input">
            <option value="related_services">Related Services</option>
            <option value="nearby_areas">Nearby Areas</option>
            <option value="custom_links">Custom Links</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#94a3b8]">Link Mode</span>
          <select value={form.link_mode} onChange={(event) => setForm({ ...form, link_mode: event.target.value as FormState['link_mode'] })} className="admin-input">
            <option value="db_page">Choose from database</option>
            <option value="manual">Manual/full URL</option>
          </select>
        </label>
        {form.link_mode === 'db_page' && (
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#94a3b8]">Choose DB Link</span>
            <select value={selectedKey} onChange={(event) => {
              const option = linkOptions.find((item) => optionKey(item) === event.target.value)
              if (option) applyOption(option, form, setForm)
            }} className="admin-input">
              <option value="">Select active page/service/area...</option>
              {linkOptions.map((option) => (
                <option key={optionKey(option)} value={optionKey(option)}>{option.label} — {option.href}</option>
              ))}
            </select>
          </label>
        )}
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#94a3b8]">Label</span>
          <input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} className="admin-input" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#94a3b8]">URL</span>
          <input value={form.href} onChange={(event) => setForm({ ...form, href: event.target.value, link_mode: 'manual' })} className="admin-input" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-[#94a3b8]">Sort Order</span>
          <input type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} className="admin-input" />
        </label>
        <div className="flex flex-wrap gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm text-[#cbd5e1]"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Active</label>
          <label className="flex items-center gap-2 text-sm text-[#cbd5e1]"><input type="checkbox" checked={form.opens_new_tab} onChange={(event) => setForm({ ...form, opens_new_tab: event.target.checked })} /> Open in new tab</label>
        </div>
      </div>
    )
  }

  const validate = (payload: ReturnType<typeof toPayload>) => {
    if (!payload.source_path || !payload.section_key || !payload.label || !payload.href) return 'Source path, section, label and URL are required.'
    return null
  }

  const createLink = async () => {
    const payload = toPayload(newLink)
    const errorText = validate(payload)
    if (errorText) { showToast('error', errorText); return }
    setSaving(true)
    const { error } = await sb.from('page_link_overrides').insert(payload)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Internal link override added.')
    setNewLink({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchAll()
  }

  const saveLink = async (row: OverrideRow) => {
    const payload = toPayload(editForm)
    const errorText = validate(payload)
    if (errorText) { showToast('error', errorText); return }
    setSaving(true)
    const { error } = await sb.from('page_link_overrides').update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Internal link override updated.')
    setEditingId(null)
    fetchAll()
  }

  const deleteLink = async (row: OverrideRow) => {
    if (!confirm(`Delete link "${s(row.label)}"?`)) return
    const { error } = await sb.from('page_link_overrides').delete().eq('id', row.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Internal link override deleted.')
    fetchAll()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2"><Link2 className="w-6 h-6 text-blue-400" /> Internal Link Overrides</h1>
          <p className="text-sm text-[#6b7280] mt-1">Control related services, nearby areas and custom page links. If blank, frontend uses smart DB suggestions.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={fetchAll} className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e] inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button type="button" onClick={() => setShowCreate((value) => !value)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Link</button>
        </div>
      </div>

      <div className="admin-card p-4 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[#cbd5e1]">Use DB links where possible. For a page with no manual overrides, frontend automatically suggests same-category related services and nearby areas where the service exists.</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-blue-500/30">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Add Internal Link</h2><button type="button" onClick={() => setShowCreate(false)} className="text-[#94a3b8] hover:text-white"><XCircle className="w-5 h-5" /></button></div>
          {renderForm(newLink, setNewLink)}
          <button type="button" onClick={createLink} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Link</button>
        </div>
      )}

      <div className="admin-card p-4">
        <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source path, section, label or URL..." className="admin-input pl-9" /></div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="admin-card p-8 text-center text-[#94a3b8]"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />Loading internal links...</div>
        ) : filteredRows.length === 0 ? (
          <div className="admin-card p-8 text-center text-[#94a3b8]"><Link2 className="w-8 h-8 mx-auto mb-3 text-[#4b5563]" />No internal link overrides found.</div>
        ) : filteredRows.map((row) => {
          const id = s(row.id)
          const active = b(row.is_active, true)
          const isEditing = editingId === id
          return (
            <div key={id} className="admin-card p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="font-semibold text-white truncate">{s(row.label)}</h2>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', badge(active))}>{active ? 'Active' : 'Inactive'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300">{s(row.section_key)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300">{s(row.source_path)}</span>
                  </div>
                  <a href={s(row.href, '#')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 break-all">{s(row.href)} <ExternalLink className="w-3 h-3 flex-shrink-0" /></a>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={() => saveLink(row)} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e] inline-flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setEditingId(id); setEditForm(toForm(row)) }} className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e]">Edit</button>
                      <button type="button" onClick={() => deleteLink(row)} className="bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-red-500/20 inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                    </>
                  )}
                </div>
              </div>
              {isEditing && renderForm(editForm, setEditForm)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

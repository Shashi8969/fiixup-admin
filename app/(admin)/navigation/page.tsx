'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateNavigationLinks } from '@/lib/actions'
import {
  CheckCircle,
  ExternalLink,
  Link2,
  Loader2,
  Navigation,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

type NavArea =
  | 'header'
  | 'footer_car_services'
  | 'footer_bike_services'
  | 'footer_cities'
  | 'footer_quick_links'

type NavRow = Record<string, unknown>

type NavForm = {
  label: string
  href: string
  nav_area: NavArea
  sort_order: string
  opens_new_tab: boolean
  is_active: boolean
}

const AREAS: { value: NavArea; label: string; helper: string }[] = [
  { value: 'header', label: 'Header', helper: 'Main top navigation' },
  { value: 'footer_car_services', label: 'Footer · Car Services', helper: 'Footer car service links' },
  { value: 'footer_bike_services', label: 'Footer · Bike Services', helper: 'Footer bike service links' },
  { value: 'footer_cities', label: 'Footer · Cities', helper: 'Footer city links' },
  { value: 'footer_quick_links', label: 'Footer · Quick Links', helper: 'Footer utility links' },
]

const EMPTY_FORM: NavForm = {
  label: '',
  href: '',
  nav_area: 'header',
  sort_order: '100',
  opens_new_tab: false,
  is_active: true,
}

function s(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function n(value: unknown, fallback = 100) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function b(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  return fallback
}

function getAreaLabel(area: unknown) {
  const value = s(area, 'header')
  return AREAS.find((item) => item.value === value)?.label ?? value
}

function normalizeHref(href: string) {
  const value = href.trim()
  if (!value) return ''
  if (
    value.startsWith('/') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('tel:') ||
    value.startsWith('mailto:') ||
    value.startsWith('#')
  ) {
    return value
  }
  return `/${value}`
}

function toForm(row: NavRow): NavForm {
  const navArea = s(row.nav_area, 'header') as NavArea
  return {
    label: s(row.label),
    href: s(row.href),
    nav_area: AREAS.some((area) => area.value === navArea) ? navArea : 'header',
    sort_order: String(n(row.sort_order, 100)),
    opens_new_tab: b(row.opens_new_tab, false),
    is_active: b(row.is_active, true),
  }
}

function toPayload(form: NavForm) {
  return {
    label: form.label.trim(),
    href: normalizeHref(form.href),
    nav_area: form.nav_area,
    sort_order: Number(form.sort_order) || 100,
    opens_new_tab: Boolean(form.opens_new_tab),
    is_active: Boolean(form.is_active),
    updated_at: new Date().toISOString(),
  }
}

function badgeClass(active: boolean) {
  return active
    ? 'bg-green-500/10 text-green-300 border-green-500/20'
    : 'bg-red-500/10 text-red-300 border-red-500/20'
}

export default function NavigationManagerPage() {
  const sb = getBrowserClient()
  const [links, setLinks] = useState<NavRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState<NavArea | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newLink, setNewLink] = useState<NavForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<NavForm>({ ...EMPTY_FORM })

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('navigation_links')
      .select('*')
      .order('nav_area', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setLinks([])
      return
    }

    setLinks((data ?? []) as NavRow[])
  }, [sb])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const filteredLinks = useMemo(() => {
    const term = query.trim().toLowerCase()
    return links.filter((link) => {
      if (areaFilter !== 'all' && s(link.nav_area) !== areaFilter) return false
      if (!term) return true

      const haystack = [s(link.label), s(link.href), s(link.nav_area)].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [links, query, areaFilter])

  const stats = useMemo(() => {
    const total = links.length
    const active = links.filter((link) => b(link.is_active, true)).length
    const header = links.filter((link) => s(link.nav_area) === 'header').length
    const footer = total - header
    return { total, active, header, footer }
  }, [links])

  const createLink = async () => {
    const payload = toPayload(newLink)

    if (!payload.label || !payload.href) {
      showToast('error', 'Label and URL are required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('navigation_links').insert(payload)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateNavigationLinks()
    showToast('success', revalidate.success ? 'Navigation link added and live cache cleared.' : 'Navigation link added. Live site may update within 1 hour.')
    setNewLink({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchLinks()
  }

  const startEdit = (link: NavRow) => {
    setEditingId(s(link.id))
    setEditForm(toForm(link))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM })
  }

  const saveLink = async (link: NavRow) => {
    const payload = toPayload(editForm)

    if (!payload.label || !payload.href) {
      showToast('error', 'Label and URL are required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('navigation_links').update(payload).eq('id', link.id)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateNavigationLinks()
    showToast('success', revalidate.success ? 'Navigation link updated and live cache cleared.' : 'Navigation link updated. Live site may update within 1 hour.')
    cancelEdit()
    fetchLinks()
  }

  const deleteLink = async (link: NavRow) => {
    if (!confirm(`Delete navigation link "${s(link.label)}"?`)) return

    const { error } = await sb.from('navigation_links').delete().eq('id', link.id)

    if (error) {
      showToast('error', error.message)
      return
    }

    const revalidate = await revalidateNavigationLinks()
    showToast('success', revalidate.success ? 'Navigation link deleted and live cache cleared.' : 'Navigation link deleted. Live site may update within 1 hour.')
    fetchLinks()
  }

  const renderForm = (form: NavForm, setForm: (next: NavForm) => void) => (
    <div className="grid md:grid-cols-2 gap-3">
      <label className="space-y-1">
        <span className="text-xs font-medium text-[#94a3b8]">Label</span>
        <input
          value={form.label}
          onChange={(event) => setForm({ ...form, label: event.target.value })}
          placeholder="Bangalore Services"
          className="admin-input"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-[#94a3b8]">URL</span>
        <input
          value={form.href}
          onChange={(event) => setForm({ ...form, href: event.target.value })}
          placeholder="/bangalore/services"
          className="admin-input"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-[#94a3b8]">Navigation Area</span>
        <select
          value={form.nav_area}
          onChange={(event) => setForm({ ...form, nav_area: event.target.value as NavArea })}
          className="admin-input"
        >
          {AREAS.map((area) => (
            <option key={area.value} value={area.value}>{area.label}</option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-[#94a3b8]">Sort Order</span>
        <input
          type="number"
          value={form.sort_order}
          onChange={(event) => setForm({ ...form, sort_order: event.target.value })}
          className="admin-input"
        />
      </label>

      <div className="md:col-span-2 flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm text-[#cbd5e1]">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-[#cbd5e1]">
          <input
            type="checkbox"
            checked={form.opens_new_tab}
            onChange={(event) => setForm({ ...form, opens_new_tab: event.target.checked })}
          />
          Open in new tab
        </label>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-400" />
            Navigation Manager
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Manage header and footer links from admin. Frontend keeps static fallback if this table is empty.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchLinks}
            className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e] inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Links', stats.total],
          ['Active', stats.active],
          ['Header', stats.header],
          ['Footer', stats.footer],
        ].map(([label, value]) => (
          <div key={label} className="admin-card p-4 text-center">
            <p className="text-2xl font-extrabold text-white">{value}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-blue-500/30">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Add Navigation Link
            </h2>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[#94a3b8] hover:text-white"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          {renderForm(newLink, setNewLink)}
          <button
            type="button"
            onClick={createLink}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Link
          </button>
        </div>
      )}

      <div className="admin-card p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search label, URL or area..."
              className="admin-input pl-9"
            />
          </div>

          <select
            value={areaFilter}
            onChange={(event) => setAreaFilter(event.target.value as NavArea | 'all')}
            className="admin-input lg:w-64"
          >
            <option value="all">All navigation areas</option>
            {AREAS.map((area) => (
              <option key={area.value} value={area.value}>{area.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="admin-card p-8 text-center text-[#94a3b8]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Loading navigation links...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="admin-card p-8 text-center text-[#94a3b8]">
            <Link2 className="w-8 h-8 mx-auto mb-3 text-[#4b5563]" />
            No navigation links found.
          </div>
        ) : filteredLinks.map((link) => {
          const id = s(link.id)
          const active = b(link.is_active, true)
          const isEditing = editingId === id

          return (
            <div key={id} className="admin-card p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="font-semibold text-white truncate">{s(link.label)}</h2>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', badgeClass(active))}>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300">
                      {getAreaLabel(link.nav_area)}
                    </span>
                    {b(link.opens_new_tab, false) && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300">
                        New tab
                      </span>
                    )}
                  </div>
                  <a
                    href={s(link.href, '#')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 break-all"
                  >
                    {s(link.href)}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <p className="text-xs text-[#6b7280] mt-2">
                    Sort order: {n(link.sort_order, 100)}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveLink(link)}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e] inline-flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(link)}
                        className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLink(link)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-red-500/20 inline-flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
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

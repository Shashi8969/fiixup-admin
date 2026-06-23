'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { revalidateNavigationLinks } from '@/lib/actions'
import {
  AlertTriangle,
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

type ScopeType = 'global' | 'city' | 'area' | 'path'
type LinkMode = 'manual' | 'db_page'

type NavRow = Record<string, unknown>
type CityRow = { slug: string; name: string }
type AreaRow = { slug: string; name: string; city_slug: string }
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

type NavForm = {
  label: string
  href: string
  nav_area: NavArea
  sort_order: string
  opens_new_tab: boolean
  is_active: boolean
  scope_type: ScopeType
  scope_city_slug: string
  scope_area_slug: string
  scope_path: string
  link_mode: LinkMode
  target_type: string
  target_id: string
}

const AREAS: { value: NavArea; label: string; helper: string }[] = [
  { value: 'header', label: 'Header', helper: 'Top navigation links' },
  { value: 'footer_car_services', label: 'Footer · Car Services', helper: 'Car service footer links' },
  { value: 'footer_bike_services', label: 'Footer · Bike Services', helper: 'Bike service footer links' },
  { value: 'footer_cities', label: 'Footer · Cities', helper: 'Footer city links' },
  { value: 'footer_quick_links', label: 'Footer · Quick Links', helper: 'Footer utility links' },
]

const SCOPES: { value: ScopeType; label: string; helper: string }[] = [
  { value: 'global', label: 'Main / Global', helper: 'Used on fiixup.in and as default fallback' },
  { value: 'city', label: 'City page scope', helper: 'Used on /bangalore and all pages inside that city' },
  { value: 'area', label: 'Area page scope', helper: 'Used on /bangalore/hsr-layout and its service pages' },
  { value: 'path', label: 'Exact page path', helper: 'Used only on one exact public URL' },
]

const EMPTY_FORM: NavForm = {
  label: '',
  href: '',
  nav_area: 'header',
  sort_order: '100',
  opens_new_tab: false,
  is_active: true,
  scope_type: 'global',
  scope_city_slug: '',
  scope_area_slug: '',
  scope_path: '',
  link_mode: 'db_page',
  target_type: '',
  target_id: '',
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

function cleanPath(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:|tel:|mailto:|#)/i.test(trimmed)) return trimmed
  if (trimmed === '/') return '/'
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`
}

function normalizeHref(href: string) {
  const value = href.trim()
  if (!value) return ''
  if (/^(https?:|tel:|mailto:|#)/i.test(value)) return value
  return cleanPath(value)
}

const STATIC_PUBLIC_PATHS = new Set([
  '/',
  '/services',
  '/about',
  '/blog',
  '/faq',
  '/contact',
  '/privacy-policy',
])

function isExternalLikeHref(value: string) {
  return /^(https?:|tel:|mailto:|#)/i.test(value.trim())
}

function hrefPathForValidation(value: string) {
  const normalized = normalizeHref(value)
  if (!normalized || isExternalLikeHref(normalized)) return normalized
  return normalized.split(/[?#]/, 1)[0] || '/'
}

function isKnownPublicHref(value: string, options: LinkOption[]) {
  if (isExternalLikeHref(value)) return true
  const candidate = hrefPathForValidation(value)
  if (STATIC_PUBLIC_PATHS.has(candidate)) return true
  return options.some((option) => hrefPathForValidation(option.href) === candidate)
}

function getAreaLabel(area: unknown) {
  const value = s(area, 'header')
  return AREAS.find((item) => item.value === value)?.label ?? value
}

function getScopeLabel(row: NavRow) {
  const scope = s(row.scope_type, 'global')
  if (scope === 'city') return `City: ${s(row.scope_city_slug, '—')}`
  if (scope === 'area') return `Area: ${s(row.scope_city_slug, '—')}/${s(row.scope_area_slug, '—')}`
  if (scope === 'path') return `Path: ${s(row.scope_path, '—')}`
  return 'Main / Global'
}

function toForm(row: NavRow): NavForm {
  const navArea = s(row.nav_area, 'header') as NavArea
  const scopeType = s(row.scope_type, 'global') as ScopeType
  const linkMode = s(row.link_mode, 'manual') as LinkMode
  return {
    label: s(row.label),
    href: s(row.href),
    nav_area: AREAS.some((area) => area.value === navArea) ? navArea : 'header',
    sort_order: String(n(row.sort_order, 100)),
    opens_new_tab: b(row.opens_new_tab, false),
    is_active: b(row.is_active, true),
    scope_type: SCOPES.some((scope) => scope.value === scopeType) ? scopeType : 'global',
    scope_city_slug: s(row.scope_city_slug),
    scope_area_slug: s(row.scope_area_slug),
    scope_path: s(row.scope_path),
    link_mode: linkMode === 'db_page' ? 'db_page' : 'manual',
    target_type: s(row.target_type),
    target_id: s(row.target_id),
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
    scope_type: form.scope_type,
    scope_city_slug: ['city', 'area'].includes(form.scope_type) ? form.scope_city_slug || null : null,
    scope_area_slug: form.scope_type === 'area' ? form.scope_area_slug || null : null,
    scope_path: form.scope_type === 'path' ? cleanPath(form.scope_path) || null : null,
    link_mode: form.link_mode,
    target_type: form.link_mode === 'db_page' ? form.target_type || null : null,
    target_id: form.link_mode === 'db_page' ? form.target_id || null : null,
    updated_at: new Date().toISOString(),
  }
}

function optionKey(option: LinkOption) {
  return `${option.target_type ?? 'manual'}::${option.target_id ?? option.href}::${option.href}`
}

function badgeClass(active: boolean) {
  return active
    ? 'bg-green-500/10 text-green-300 border-green-500/20'
    : 'bg-red-500/10 text-red-300 border-red-500/20'
}

function optionMatchesScope(option: LinkOption, form: NavForm) {
  if (form.scope_type === 'global') return true
  if (form.scope_type === 'city') {
    return !option.city_slug || option.city_slug === form.scope_city_slug
  }
  if (form.scope_type === 'area') {
    if (option.area_slug) return option.city_slug === form.scope_city_slug && option.area_slug === form.scope_area_slug
    return !option.city_slug || option.city_slug === form.scope_city_slug
  }
  return true
}

export default function NavigationManagerPage() {
  const sb = getBrowserClient()
  const [links, setLinks] = useState<NavRow[]>([])
  const [cities, setCities] = useState<CityRow[]>([])
  const [areas, setAreas] = useState<AreaRow[]>([])
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([])
  const [issues, setIssues] = useState<NavRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState<NavArea | 'all'>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeType | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newLink, setNewLink] = useState<NavForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<NavForm>({ ...EMPTY_FORM })

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [linksResult, citiesResult, areasResult, optionsResult, issuesResult] = await Promise.all([
      sb
        .from('navigation_links')
        .select('*')
        .order('nav_area', { ascending: true })
        .order('scope_type', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      sb.from('cities').select('slug,name').order('name'),
      sb.from('areas').select('slug,name,city_slug').order('city_slug').order('sort_order'),
      sb.from('cms_public_link_options').select('*').order('label'),
      sb.from('cms_scoped_navigation_link_issues').select('*').order('nav_area').order('label'),
    ])

    setLoading(false)

    if (linksResult.error) {
      showToast('error', linksResult.error.message)
      setLinks([])
    } else {
      setLinks((linksResult.data ?? []) as NavRow[])
    }

    setCities((citiesResult.data ?? []) as CityRow[])
    setAreas((areasResult.data ?? []) as AreaRow[])
    setLinkOptions((optionsResult.data ?? []) as LinkOption[])
    setIssues((issuesResult.data ?? []) as NavRow[])
  }, [sb])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filteredLinks = useMemo(() => {
    const term = query.trim().toLowerCase()
    return links.filter((link) => {
      if (areaFilter !== 'all' && s(link.nav_area) !== areaFilter) return false
      if (scopeFilter !== 'all' && s(link.scope_type, 'global') !== scopeFilter) return false
      if (!term) return true
      const haystack = [
        s(link.label), s(link.href), s(link.nav_area), s(link.scope_type),
        s(link.scope_city_slug), s(link.scope_area_slug), s(link.scope_path),
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [links, query, areaFilter, scopeFilter])

  const stats = useMemo(() => {
    const total = links.length
    const active = links.filter((link) => b(link.is_active, true)).length
    const header = links.filter((link) => s(link.nav_area) === 'header').length
    const scoped = links.filter((link) => s(link.scope_type, 'global') !== 'global').length
    return { total, active, header, scoped }
  }, [links])

  const getAreasForCity = (citySlug: string) => areas.filter((area) => area.city_slug === citySlug)

  const applyOption = (option: LinkOption, form: NavForm, setForm: (next: NavForm) => void) => {
    setForm({
      ...form,
      label: form.label || option.label,
      href: option.href,
      link_mode: 'db_page',
      target_type: option.target_type ?? '',
      target_id: option.target_id ?? '',
    })
  }

  const renderDbPicker = (form: NavForm, setForm: (next: NavForm) => void) => {
    const options = linkOptions.filter((option) => optionMatchesScope(option, form)).slice(0, 500)
    const selectedKey = form.target_type && form.target_id
      ? `${form.target_type}::${form.target_id}::${form.href}`
      : ''

    return (
      <label className="space-y-1 md:col-span-2">
        <span className="text-xs font-medium text-[#94a3b8]">Choose DB Link</span>
        <select
          value={selectedKey}
          onChange={(event) => {
            const option = options.find((item) => optionKey(item) === event.target.value)
            if (option) applyOption(option, form, setForm)
          }}
          className="admin-input"
        >
          <option value="">Select existing page/service/area from database...</option>
          {options.map((option) => (
            <option key={optionKey(option)} value={optionKey(option)}>
              {option.label} — {option.href}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#6b7280]">
          Recommended: choose from DB to prevent broken header/footer links. Manual URL still allowed below.
        </p>
      </label>
    )
  }

  const renderForm = (form: NavForm, setForm: (next: NavForm) => void) => {
    const cityAreas = getAreasForCity(form.scope_city_slug)

    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#94a3b8]">Scope</span>
            <select
              value={form.scope_type}
              onChange={(event) => setForm({ ...form, scope_type: event.target.value as ScopeType, scope_area_slug: '', scope_path: '' })}
              className="admin-input"
            >
              {SCOPES.map((scope) => (
                <option key={scope.value} value={scope.value}>{scope.label}</option>
              ))}
            </select>
            <p className="text-xs text-[#6b7280]">{SCOPES.find((scope) => scope.value === form.scope_type)?.helper}</p>
          </label>

          {['city', 'area'].includes(form.scope_type) && (
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#94a3b8]">City</span>
              <select
                value={form.scope_city_slug}
                onChange={(event) => setForm({ ...form, scope_city_slug: event.target.value, scope_area_slug: '' })}
                className="admin-input"
              >
                <option value="">Choose city...</option>
                {cities.map((city) => (
                  <option key={city.slug} value={city.slug}>{city.name}</option>
                ))}
              </select>
            </label>
          )}

          {form.scope_type === 'area' && (
            <label className="space-y-1">
              <span className="text-xs font-medium text-[#94a3b8]">Area</span>
              <select
                value={form.scope_area_slug}
                onChange={(event) => setForm({ ...form, scope_area_slug: event.target.value })}
                className="admin-input"
              >
                <option value="">Choose area...</option>
                {cityAreas.map((area) => (
                  <option key={area.slug} value={area.slug}>{area.name}</option>
                ))}
              </select>
            </label>
          )}

          {form.scope_type === 'path' && (
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-medium text-[#94a3b8]">Exact Page Path</span>
              <input
                value={form.scope_path}
                onChange={(event) => setForm({ ...form, scope_path: event.target.value })}
                placeholder="/bangalore/services/battery"
                className="admin-input"
              />
            </label>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-[#94a3b8]">Link Mode</span>
            <select
              value={form.link_mode}
              onChange={(event) => setForm({ ...form, link_mode: event.target.value as LinkMode })}
              className="admin-input"
            >
              <option value="db_page">Choose from database</option>
              <option value="manual">Manual/full URL</option>
            </select>
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

          {form.link_mode === 'db_page' && renderDbPicker(form, setForm)}

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
              onChange={(event) => setForm({ ...form, href: event.target.value, link_mode: 'manual' })}
              placeholder="/bangalore/services or https://example.com/page"
              className="admin-input"
            />
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

          <div className="flex flex-wrap gap-4 pt-6">
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
      </div>
    )
  }

  const validateForm = (payload: ReturnType<typeof toPayload>) => {
    if (!payload.label || !payload.href) return 'Label and URL are required.'
    if (payload.scope_type === 'city' && !payload.scope_city_slug) return 'Choose city for city-scoped link.'
    if (payload.scope_type === 'area' && (!payload.scope_city_slug || !payload.scope_area_slug)) return 'Choose city and area for area-scoped link.'
    if (payload.scope_type === 'path' && !payload.scope_path) return 'Enter exact page path for path-scoped link.'

    if (payload.is_active && !isKnownPublicHref(payload.href, linkOptions)) {
      return `This internal URL is not an active public page: ${hrefPathForValidation(payload.href)}`
    }

    if (
      payload.is_active &&
      payload.scope_type === 'path' &&
      payload.scope_path &&
      !isKnownPublicHref(payload.scope_path, linkOptions)
    ) {
      return `The selected scope path is not an active public page: ${hrefPathForValidation(payload.scope_path)}`
    }

    if (payload.link_mode === 'db_page') {
      const selectedTargetExists = linkOptions.some((option) =>
        option.target_type === payload.target_type &&
        String(option.target_id ?? '') === String(payload.target_id ?? '') &&
        hrefPathForValidation(option.href) === hrefPathForValidation(payload.href)
      )
      if (!selectedTargetExists) return 'Choose a valid active page from the database list.'
    }

    return null
  }

  const createLink = async () => {
    const payload = toPayload(newLink)
    const validationError = validateForm(payload)
    if (validationError) { showToast('error', validationError); return }

    setSaving(true)
    const { error } = await sb.from('navigation_links').insert(payload)
    setSaving(false)

    if (error) { showToast('error', error.message); return }

    const revalidate = await revalidateNavigationLinks()
    showToast('success', revalidate.success ? 'Navigation link added and live cache cleared.' : 'Navigation link added. Live site may update within 1 hour.')
    setNewLink({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchAll()
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
    const validationError = validateForm(payload)
    if (validationError) { showToast('error', validationError); return }

    setSaving(true)
    const { error } = await sb.from('navigation_links').update(payload).eq('id', link.id)
    setSaving(false)

    if (error) { showToast('error', error.message); return }

    const revalidate = await revalidateNavigationLinks()
    showToast('success', revalidate.success ? 'Navigation link updated and live cache cleared.' : 'Navigation link updated. Live site may update within 1 hour.')
    cancelEdit()
    fetchAll()
  }

  const deleteLink = async (link: NavRow) => {
    if (!confirm(`Delete navigation link "${s(link.label)}"?`)) return
    const { error } = await sb.from('navigation_links').delete().eq('id', link.id)
    if (error) { showToast('error', error.message); return }
    const revalidate = await revalidateNavigationLinks()
    showToast('success', revalidate.success ? 'Navigation link deleted and live cache cleared.' : 'Navigation link deleted. Live site may update within 1 hour.')
    fetchAll()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-400" />
            Scoped Navigation Manager
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Control header/footer links globally, city-wise, area-wise, or for one exact page. Choose DB links or add manual full URLs.
          </p>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={fetchAll} className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e] inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button type="button" onClick={() => setShowCreate((value) => !value)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Link
          </button>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="admin-card p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-200">{issues.length} navigation link warning(s)</p>
              <p className="text-sm text-[#94a3b8] mt-1">
                These active internal links are not found in active DB/public pages. Use “Choose from database” or create the missing page.
              </p>
              <div className="mt-3 grid md:grid-cols-2 gap-2">
                {issues.slice(0, 6).map((issue) => (
                  <div key={s(issue.id)} className="text-xs bg-[#111827] border border-[#2a2d3e] rounded-lg px-3 py-2 text-[#cbd5e1]">
                    <span className="font-semibold text-white">{s(issue.label)}</span> → {s(issue.href)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Links', stats.total], ['Active', stats.active], ['Header', stats.header], ['Scoped', stats.scoped],
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
            <h2 className="font-semibold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Add Navigation Link</h2>
            <button type="button" onClick={() => setShowCreate(false)} className="text-[#94a3b8] hover:text-white"><XCircle className="w-5 h-5" /></button>
          </div>
          {renderForm(newLink, setNewLink)}
          <button type="button" onClick={createLink} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Link
          </button>
        </div>
      )}

      <div className="admin-card p-4">
        <div className="grid lg:grid-cols-[1fr_220px_220px] gap-3 lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search label, URL, city, area or scope..." className="admin-input pl-9" />
          </div>
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value as NavArea | 'all')} className="admin-input">
            <option value="all">All navigation areas</option>
            {AREAS.map((area) => (<option key={area.value} value={area.value}>{area.label}</option>))}
          </select>
          <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as ScopeType | 'all')} className="admin-input">
            <option value="all">All scopes</option>
            {SCOPES.map((scope) => (<option key={scope.value} value={scope.value}>{scope.label}</option>))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="admin-card p-8 text-center text-[#94a3b8]"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />Loading navigation links...</div>
        ) : filteredLinks.length === 0 ? (
          <div className="admin-card p-8 text-center text-[#94a3b8]"><Link2 className="w-8 h-8 mx-auto mb-3 text-[#4b5563]" />No navigation links found.</div>
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
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border', badgeClass(active))}>{active ? 'Active' : 'Inactive'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-300">{getAreaLabel(link.nav_area)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300">{getScopeLabel(link)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-slate-500/20 bg-slate-500/10 text-slate-300">{s(link.link_mode, 'manual')}</span>
                  </div>
                  <a href={s(link.href, '#')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 break-all">
                    {s(link.href)} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <p className="text-xs text-[#6b7280] mt-2">Sort order: {n(link.sort_order, 100)}</p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={() => saveLink(link)} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 text-sm font-semibold transition-colors inline-flex items-center gap-2 disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save
                      </button>
                      <button type="button" onClick={cancelEdit} className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e] inline-flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(link)} className="bg-[#1f2330] hover:bg-[#2a2d3e] text-[#cbd5e1] rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-[#2a2d3e]">Edit</button>
                      <button type="button" onClick={() => deleteLink(link)} className="bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg px-3 py-2 text-sm font-semibold transition-colors border border-red-500/20 inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
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

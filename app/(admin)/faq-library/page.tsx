'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import {
  CheckCircle,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

type FaqRow = Record<string, unknown>

type FaqForm = {
  question: string
  answer: string
  faq_type: string
  service_category: string
  service_slug: string
  city_slug: string
  area_slug: string
  is_global: boolean
  is_active: boolean
  sort_order: string
}

const EMPTY_FORM: FaqForm = {
  question: '',
  answer: '',
  faq_type: 'General',
  service_category: '',
  service_slug: '',
  city_slug: '',
  area_slug: '',
  is_global: true,
  is_active: true,
  sort_order: '100',
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

function getQuestion(row: FaqRow) {
  return s(row.question || row.q)
}

function getAnswer(row: FaqRow) {
  return s(row.answer || row.a)
}

function getFaqType(row: FaqRow) {
  return s(row.faq_type || row.category || row.group_name, 'General')
}

function toForm(row: FaqRow): FaqForm {
  return {
    question: getQuestion(row),
    answer: getAnswer(row),
    faq_type: getFaqType(row),
    service_category: s(row.service_category),
    service_slug: s(row.service_slug),
    city_slug: s(row.city_slug),
    area_slug: s(row.area_slug),
    is_global: b(row.is_global, true),
    is_active: b(row.is_active, true),
    sort_order: String(n(row.sort_order, 100)),
  }
}

function toPayload(form: FaqForm) {
  return {
    question: form.question.trim(),
    answer: form.answer.trim(),
    faq_type: form.faq_type.trim() || 'General',
    service_category: form.service_category.trim() || null,
    service_slug: form.service_slug.trim() || null,
    city_slug: form.city_slug.trim() || null,
    area_slug: form.area_slug.trim() || null,
    is_global: Boolean(form.is_global),
    is_active: Boolean(form.is_active),
    sort_order: Number(form.sort_order) || 100,
    updated_at: new Date().toISOString(),
  }
}

function badgeClass(active: boolean) {
  return active
    ? 'bg-green-500/10 text-green-300 border-green-500/20'
    : 'bg-red-500/10 text-red-300 border-red-500/20'
}

export default function FaqLibraryPage() {
  const sb = getBrowserClient()
  const [faqs, setFaqs] = useState<FaqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newFaq, setNewFaq] = useState<FaqForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FaqForm>({ ...EMPTY_FORM })

  const fetchFaqs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('faq_library')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setFaqs([])
      return
    }

    setFaqs((data ?? []) as FaqRow[])
  }, [sb])

  useEffect(() => {
    fetchFaqs()
  }, [fetchFaqs])

  const faqTypes = useMemo(() => {
    const set = new Set<string>()
    faqs.forEach((faq) => {
      const type = getFaqType(faq).trim()
      if (type) set.add(type)
    })
    return Array.from(set).sort((a, z) => a.localeCompare(z))
  }, [faqs])

  const filteredFaqs = useMemo(() => {
    const term = query.trim().toLowerCase()
    return faqs.filter((faq) => {
      const type = getFaqType(faq)
      if (typeFilter !== 'all' && type !== typeFilter) return false
      if (!term) return true

      const haystack = [
        getQuestion(faq),
        getAnswer(faq),
        getFaqType(faq),
        s(faq.service_category),
        s(faq.service_slug),
        s(faq.city_slug),
        s(faq.area_slug),
      ].join(' ').toLowerCase()

      return haystack.includes(term)
    })
  }, [faqs, query, typeFilter])

  const stats = useMemo(() => {
    const total = faqs.length
    const active = faqs.filter((faq) => b(faq.is_active, true)).length
    const global = faqs.filter((faq) => b(faq.is_global, true)).length
    const local = total - global
    return { total, active, global, local }
  }, [faqs])

  const createFaq = async () => {
    const payload = toPayload(newFaq)

    if (!payload.question || !payload.answer) {
      showToast('error', 'Question and answer are required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('faq_library').insert(payload)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'FAQ added.')
    setNewFaq({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchFaqs()
  }

  const startEdit = (faq: FaqRow) => {
    setEditingId(s(faq.id))
    setEditForm(toForm(faq))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM })
  }

  const saveFaq = async (faq: FaqRow) => {
    const payload = toPayload(editForm)

    if (!payload.question || !payload.answer) {
      showToast('error', 'Question and answer are required.')
      return
    }

    setSaving(true)
    const { error } = await sb
      .from('faq_library')
      .update(payload)
      .eq('id', faq.id)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'FAQ saved.')
    cancelEdit()
    fetchFaqs()
  }

  const deleteFaq = async (faq: FaqRow) => {
    if (!confirm('Delete this FAQ from the library?')) return

    const { error } = await sb
      .from('faq_library')
      .delete()
      .eq('id', faq.id)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'FAQ deleted.')
    fetchFaqs()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-400" />
            FAQ Library
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Manage reusable public FAQs for the main FAQ page and future service/category FAQ mapping.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchFaqs} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={() => setShowCreate((open) => !open)} className="admin-btn-primary">
            <Plus className="w-4 h-4" />
            Add FAQ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total FAQs</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.active}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Active</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.global}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Global</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.local}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Targeted</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-dashed">
          <div>
            <p className="text-sm font-semibold text-white">Add new FAQ</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Keep answers helpful and non-duplicate. Use service/city fields only when the FAQ is specific.
            </p>
          </div>
          <FaqFormFields form={newFaq} setForm={setNewFaq} />
          <div className="flex gap-2">
            <button onClick={createFaq} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add FAQ
            </button>
            <button onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-card p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by question, answer, service, city, or area…"
            className="admin-input pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="admin-input md:w-52"
        >
          <option value="all">All FAQ groups</option>
          {faqTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <HelpCircle className="w-8 h-8 text-[#4b5563] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">No FAQs found.</p>
          <p className="text-xs text-[#6b7280] mt-1">Add your first reusable FAQ above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const faqId = s(faq.id)
            const active = b(faq.is_active, true)
            const editing = editingId === faqId
            return (
              <div key={faqId} className="admin-card p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-semibold text-[#e2e8f0]">{getQuestion(faq)}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-300 border-blue-500/20 font-semibold">
                        {getFaqType(faq)}
                      </span>
                      <span className={clsx('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold', badgeClass(active))}>
                        {active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
                      {getAnswer(faq)}
                    </p>
                    <p className="text-xs text-[#6b7280] mt-3">
                      {[
                        s(faq.service_category),
                        s(faq.service_slug),
                        s(faq.city_slug),
                        s(faq.area_slug),
                      ].filter(Boolean).join(' · ') || 'General public FAQ'}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(faq)} className="admin-btn-secondary">Edit</button>
                    <button onClick={() => deleteFaq(faq)} className="admin-btn-danger">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {editing && (
                  <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
                    <FaqFormFields form={editForm} setForm={setEditForm} />
                    <div className="flex gap-2">
                      <button onClick={() => saveFaq(faq)} disabled={saving} className="admin-btn-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save FAQ
                      </button>
                      <button onClick={cancelEdit} className="admin-btn-secondary">Cancel</button>
                    </div>
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

function FaqFormFields({ form, setForm }: {
  form: FaqForm
  setForm: React.Dispatch<React.SetStateAction<FaqForm>>
}) {
  const update = (key: keyof FaqForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="admin-label">Question *</label>
        <input
          value={form.question}
          onChange={(event) => update('question', event.target.value)}
          className="admin-input"
          placeholder="Example: How fast can Fiixup reach my location?"
        />
      </div>
      <div className="md:col-span-2">
        <label className="admin-label">Answer *</label>
        <textarea
          value={form.answer}
          onChange={(event) => update('answer', event.target.value)}
          rows={4}
          className="admin-textarea"
          placeholder="Write a clear, helpful answer."
        />
      </div>
      <div>
        <label className="admin-label">FAQ Group</label>
        <input
          value={form.faq_type}
          onChange={(event) => update('faq_type', event.target.value)}
          className="admin-input"
          placeholder="General, Battery, Towing, Pricing…"
        />
      </div>
      <div>
        <label className="admin-label">Sort Order</label>
        <input
          type="number"
          value={form.sort_order}
          onChange={(event) => update('sort_order', event.target.value)}
          className="admin-input"
        />
      </div>
      <div>
        <label className="admin-label">Service Category</label>
        <input
          value={form.service_category}
          onChange={(event) => update('service_category', event.target.value)}
          className="admin-input"
          placeholder="battery, towing, car, bike…"
        />
      </div>
      <div>
        <label className="admin-label">Service Slug</label>
        <input
          value={form.service_slug}
          onChange={(event) => update('service_slug', event.target.value)}
          className="admin-input"
          placeholder="car-battery-replacement-near-me"
        />
      </div>
      <div>
        <label className="admin-label">City Slug</label>
        <input
          value={form.city_slug}
          onChange={(event) => update('city_slug', event.target.value)}
          className="admin-input"
          placeholder="bangalore"
        />
      </div>
      <div>
        <label className="admin-label">Area Slug</label>
        <input
          value={form.area_slug}
          onChange={(event) => update('area_slug', event.target.value)}
          className="admin-input"
          placeholder="hsr-layout"
        />
      </div>
      <label className="flex items-center gap-3 text-sm text-[#cbd5e1]">
        <input
          type="checkbox"
          checked={form.is_global}
          onChange={(event) => update('is_global', event.target.checked)}
          className="w-4 h-4 rounded border-[#334155] bg-[#0f1117]"
        />
        Show on main FAQ page
      </label>
      <label className="flex items-center gap-3 text-sm text-[#cbd5e1]">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) => update('is_active', event.target.checked)}
          className="w-4 h-4 rounded border-[#334155] bg-[#0f1117]"
        />
        Active
      </label>
    </div>
  )
}

'use client'
// app/(admin)/services/[slug]/page.tsx
// Full Service editor — SEO | Details | Pricing | Brands | Features | FAQs

import { useEffect, useState } from 'react'
import { useParams }           from 'next/navigation'
import Link                    from 'next/link'
import { getBrowserClient }    from '@/lib/supabase'
import { Field }               from '@/components/ui/Field'
import { ChildTableEditor }    from '@/components/editors/ChildTableEditor'
import { showToast }           from '@/components/ui/Toast'
import { saveService }         from '@/lib/actions'
import {
  ArrowLeft, ExternalLink, Loader2,
  RefreshCw, Package,
} from 'lucide-react'
import { clsx } from 'clsx'

const TABS = ['SEO', 'Details', 'Pricing', 'Features', 'FAQs', 'Testimonials', 'Brands'] as const
type Tab = typeof TABS[number]

export default function ServiceEditorPage() {
  const params      = useParams()
  const serviceSlug = String(params.slug)

  const [svc,      setSvc]      = useState<Record<string, unknown> | null>(null)
  const [svcFaqs,  setSvcFaqs]  = useState<Record<string, unknown>[]>([])
  const [svcTests, setSvcTests] = useState<Record<string, unknown>[]>([])
  const [svcBrands,setSvcBrands]= useState<Record<string, unknown>[]>([])
  const [tab,      setTab]      = useState<Tab>('SEO')
  const [loading,  setLoading]  = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const sb = getBrowserClient()

    const { data } = await sb.from('services').select('*').eq('slug', serviceSlug).single()
    if (!data) { setLoading(false); return }
    setSvc(data)

    const [faqs, tests, brands] = await Promise.all([
      sb.from('service_faqs').select('*').eq('service_id', data.id).order('sort_order'),
      sb.from('service_testimonials').select('*').eq('service_id', data.id).order('sort_order'),
      sb.from('service_brands').select('*').eq('service_id', data.id).order('sort_order'),
    ])

    setSvcFaqs  (faqs.data   ?? [])
    setSvcTests (tests.data  ?? [])
    setSvcBrands(brands.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [serviceSlug])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!svc) return <div className="text-red-400 p-8">Service not found: {serviceSlug}</div>

  const save = (col: string) => async (val: string) => {
    const result = await saveService(String(svc.id), serviceSlug, { [col]: val })
    if (!result.success) return result
    setSvc((p) => p ? { ...p, [col]: val } : p)
    showToast('success', result.message)
    return result
  }

  const saveJson = async (col: string, val: string) => {
    try {
      const parsed = JSON.parse(val)
      const result = await saveService(String(svc.id), serviceSlug, { [col]: parsed })
      if (!result.success) { showToast('error', result.error); return }
      setSvc((p) => p ? { ...p, [col]: parsed } : p)
      showToast('success', result.message)
    } catch {
      showToast('error', 'Invalid JSON')
    }
  }

  // Child table CRUD via direct Supabase (no server actions needed for non-revalidating tables)
  const sb = getBrowserClient()

  const faqActions = {
    onSave: async (id: string, data: Record<string, unknown>) => {
      const { error } = await sb.from('service_faqs').update(data).eq('id', id)
      if (error) return { success: false as const, error: error.message }
      fetchAll()
      return { success: true as const, message: 'FAQ saved.' }
    },
    onAdd: async (data: Record<string, unknown>) => {
      const { error } = await sb.from('service_faqs').insert({ ...data, service_id: svc.id })
      if (error) return { success: false as const, error: error.message }
      fetchAll()
      return { success: true as const, message: 'FAQ added.' }
    },
    onDelete: async (id: string) => {
      const { error } = await sb.from('service_faqs').delete().eq('id', id)
      if (error) return { success: false as const, error: error.message }
      fetchAll()
      return { success: true as const, message: 'FAQ deleted.' }
    },
  }

  const testActions = {
    onSave: async (id: string, data: Record<string, unknown>) => {
      const { error } = await sb.from('service_testimonials').update(data).eq('id', id)
      if (error) return { success: false as const, error: error.message }
      fetchAll()
      return { success: true as const, message: 'Testimonial saved.' }
    },
    onAdd: async (data: Record<string, unknown>) => {
      const { error } = await sb.from('service_testimonials').insert({ ...data, service_id: svc.id })
      if (error) return { success: false as const, error: error.message }
      fetchAll()
      return { success: true as const, message: 'Testimonial added.' }
    },
    onDelete: async (id: string) => {
      const { error } = await sb.from('service_testimonials').delete().eq('id', id)
      if (error) return { success: false as const, error: error.message }
      fetchAll()
      return { success: true as const, message: 'Testimonial deleted.' }
    },
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/services" className="p-2 rounded-lg hover:bg-[#2a2d3e] transition-colors text-[#6b7280]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              {String(svc.title ?? 'Untitled Service')}
            </h1>
            <p className="text-sm text-[#6b7280] mt-0.5">
              {serviceSlug} · <span className="capitalize">{String(svc.category)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="admin-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <a href={`https://fiixup.in/services/${serviceSlug}`} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
            <ExternalLink className="w-4 h-4" /> View Live
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'tab-active' : 'tab-inactive'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* ── SEO ── */}
      {tab === 'SEO' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">SEO Meta</h2>
          <Field label="Meta Title"       value={String(svc.meta_title ?? '')}       onSave={save('meta_title')} />
          <Field label="Meta Description" value={String(svc.meta_description ?? '')} onSave={save('meta_description')} multiline rows={3} />
          <Field label="Meta Keywords"    value={String(svc.meta_keywords ?? '')}    onSave={save('meta_keywords')} multiline rows={2} />
          <Field label="OG Image URL"     value={String(svc.og_image_url ?? '')}     onSave={save('og_image_url')} />
        </div>
      )}

      {/* ── Details ── */}
      {tab === 'Details' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">Service Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title"       value={String(svc.title ?? '')}       onSave={save('title')} />
            <Field label="Short Title" value={String(svc.short_title ?? '')} onSave={save('short_title')} />
          </div>
          <Field label="Tagline"     value={String(svc.tagline ?? '')}     onSave={save('tagline')} />
          <Field label="Description" value={String(svc.description ?? '')} onSave={save('description')} multiline rows={5} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (display, e.g. ₹599)"  value={String(svc.price ?? '')}    onSave={save('price')} />
            <Field label="Duration (e.g. 30–45 min)"   value={String(svc.duration ?? '')} onSave={save('duration')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price From (int, ₹)" value={String(svc.price_from_int ?? '')} numeric onSave={save('price_from_int')} />
            <Field label="Price To (int, ₹)"   value={String(svc.price_to_int ?? '')}  numeric onSave={save('price_to_int')} />
          </div>
          <Field label="Icon (Lucide icon name)" value={String(svc.icon ?? '')} onSave={save('icon')} />
          <Field label="Image URL"     value={String(svc.image_url ?? '')}  onSave={save('image_url')} />
          <Field label="Image Alt"     value={String(svc.image_alt ?? '')}  onSave={save('image_alt')} />
        </div>
      )}

      {/* ── Pricing ── */}
      {tab === 'Pricing' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Pricing JSON</h2>
          <p className="text-xs text-[#6b7280]">
            The <code className="text-blue-400">pricing</code> column stores a JSON object with a <code className="text-blue-400">rows</code> array.
            Each row: <code className="text-blue-400">{'{ label, priceFrom, priceTo, note }'}</code>
          </p>
          <JsonSaveField
            label="Pricing Object (JSON)"
            value={svc.pricing}
            onSave={(val) => saveJson('pricing', val)}
          />
        </div>
      )}

      {/* ── Features ── */}
      {tab === 'Features' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Features & Benefits</h2>
          <p className="text-xs text-[#6b7280]">
            Features: array of strings. Benefits: array of objects with heading + text.
          </p>
          <JsonSaveField
            label="Features (JSON array of strings)"
            value={svc.features}
            onSave={(val) => saveJson('features', val)}
          />
          <JsonSaveField
            label="Benefits (JSON array)"
            value={svc.benefits}
            onSave={(val) => saveJson('benefits', val)}
          />
        </div>
      )}

      {/* ── FAQs ── */}
      {tab === 'FAQs' && (
        <div className="admin-card p-6">
          <ChildTableEditor
            title="FAQs"
            items={svcFaqs}
            idKey="id"
            fields={[
              { key: 'question',   label: 'Question',   type: 'textarea', rows: 2, required: true },
              { key: 'answer',     label: 'Answer',     type: 'textarea', rows: 4, required: true },
              { key: 'sort_order', label: 'Sort Order', type: 'number' },
            ]}
            {...faqActions}
            addLabel="Add FAQ"
            emptyText="No FAQs yet."
          />
        </div>
      )}

      {/* ── Testimonials ── */}
      {tab === 'Testimonials' && (
        <div className="admin-card p-6">
          <ChildTableEditor
            title="Testimonials"
            items={svcTests}
            idKey="id"
            fields={[
              { key: 'name',       label: 'Customer Name', type: 'text',     required: true },
              { key: 'vehicle',    label: 'Vehicle',        type: 'text'     },
              { key: 'location',   label: 'Location',       type: 'text'     },
              { key: 'rating',     label: 'Rating (1–5)',   type: 'number',   required: true },
              { key: 'body',       label: 'Review Text',    type: 'textarea', rows: 4, required: true },
              { key: 'date_label', label: 'Date Label',     type: 'text',     placeholder: 'e.g. April 2025' },
              { key: 'sort_order', label: 'Sort Order',     type: 'number'   },
            ]}
            {...testActions}
            addLabel="Add Testimonial"
            emptyText="No testimonials yet."
          />
        </div>
      )}

      {/* ── Brands ── */}
      {tab === 'Brands' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Car & Bike Brands</h2>
          <p className="text-xs text-[#6b7280]">
            Legacy JSONB format — edit directly as JSON arrays.
          </p>
          <JsonSaveField
            label="Car Brands (JSON)"
            value={svc.car_brands}
            onSave={(val) => saveJson('car_brands', val)}
          />
          <JsonSaveField
            label="Bike Brands (JSON)"
            value={svc.bike_brands}
            onSave={(val) => saveJson('bike_brands', val)}
          />
        </div>
      )}
    </div>
  )
}

// ─── Reusable JSON save field ─────────────────────────────────────────────────
function JsonSaveField({
  label,
  value,
  onSave,
}: {
  label: string
  value: unknown
  onSave: (val: string) => void
}) {
  const [text,   setText]   = useState(JSON.stringify(value ?? [], null, 2))
  const [error,  setError]  = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try { JSON.parse(text); setError('') }
    catch { setError('Invalid JSON'); return }
    setSaving(true)
    await onSave(text)
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <label className="admin-label">{label}</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="admin-textarea font-mono text-xs"
        spellCheck={false}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button onClick={handleSave} disabled={saving} className="admin-btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save JSON
      </button>
    </div>
  )
}

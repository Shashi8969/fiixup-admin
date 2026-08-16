'use client'
// app/(admin)/brands/[slug]/page.tsx
// Brand page editor — SEO | Details | Content | FAQs | Preview
// Mirrors app/(admin)/services/[slug]/page.tsx's structure. brand_pages has
// no normalized child tables (models/common_issues/sections/faqs are all
// JSONB columns on the row), so Content/FAQs use the same JsonSaveField
// pattern the Services editor uses for its Pricing/Features/Brands tabs.

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { Field } from '@/components/ui/Field'
import { ImagePickerField } from '@/components/media/ImagePickerField'
import { SeoMetaPanel } from '@/components/seo/SeoMetaPanel'
import { AdminBackButton } from '@/components/navigation/AdminBackButton'
import { LivePagePreview } from '@/components/preview/LivePagePreview'
import { publicSiteUrl } from '@/lib/public-site'
import { showToast } from '@/components/ui/Toast'
import { saveBrandPage } from '@/lib/actions'
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Car, Bike } from 'lucide-react'
import { clsx } from 'clsx'

const TABS = ['SEO', 'Details', 'Content', 'FAQs', 'Preview'] as const
type Tab = typeof TABS[number]

export default function BrandPageEditor() {
  const params = useParams()
  const brandSlug = String(params.slug)

  const [brand,   setBrand]   = useState<Record<string, unknown> | null>(null)
  const [tab,     setTab]     = useState<Tab>('SEO')
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const sb = getBrowserClient()
    const { data } = await sb.from('brand_pages').select('*').eq('slug', brandSlug).single()
    setBrand(data ?? null)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [brandSlug])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!brand) return <div className="text-red-400 p-8">Brand page not found: {brandSlug}</div>

  const isCar = brand.vehicle_type === 'car'

  const save = (col: string) => async (val: unknown) => {
    const result = await saveBrandPage(String(brand.id), brandSlug, { [col]: val })
    if (!result.success) return result
    setBrand((p) => (p ? { ...p, [col]: val } : p))
    showToast('success', result.message)
    return result
  }

  const saveJson = async (col: string, val: string) => {
    try {
      const parsed = JSON.parse(val)
      const result = await saveBrandPage(String(brand.id), brandSlug, { [col]: parsed })
      if (!result.success) { showToast('error', result.error); return }
      setBrand((p) => (p ? { ...p, [col]: parsed } : p))
      showToast('success', result.message)
    } catch {
      showToast('error', 'Invalid JSON')
    }
  }

  const liveUrl = publicSiteUrl(`/brands/${brandSlug}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBackButton fallbackHref="/brands" className="p-2 rounded-lg hover:bg-[#2a2d3e] transition-colors text-[#6b7280]">
            <ArrowLeft className="w-5 h-5" />
          </AdminBackButton>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              {isCar ? <Car className="w-5 h-5 text-blue-400" /> : <Bike className="w-5 h-5 text-red-400" />}
              {String(brand.brand_name ?? 'Untitled Brand')}
            </h1>
            <p className="text-sm text-[#6b7280] mt-0.5">
              {brandSlug} · <span className="capitalize">{String(brand.vehicle_type)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="admin-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
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
        <SeoMetaPanel
          title={String(brand.meta_title ?? '')}
          description={String(brand.meta_description ?? '')}
          keywords={String(brand.meta_keywords ?? '')}
          urlPath={`/brands/${brandSlug}`}
          onSaveTitle={save('meta_title')}
          onSaveDescription={save('meta_description')}
          onSaveKeywords={save('meta_keywords')}
        />
      )}

      {/* ── Details ── */}
      {tab === 'Details' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">Brand Details</h2>
          <ImagePickerField
            label="Logo URL" value={String(brand.logo_url ?? '')} onSave={save('logo_url')}
            altLabel="Logo Alt Text" altValue={String(brand.logo_alt ?? '')} onSaveAlt={save('logo_alt')}
          />
          <Field label="Tagline" value={String(brand.tagline ?? '')} onSave={save('tagline')} />
          <Field label="Hero Heading" value={String(brand.hero_heading ?? '')} onSave={save('hero_heading')} />
          <Field label="Hero Subheading" value={String(brand.hero_subheading ?? '')} onSave={save('hero_subheading')} multiline rows={2} />
          <Field label="About / Description" value={String(brand.description ?? '')} onSave={save('description')} multiline rows={5} />
        </div>
      )}

      {/* ── Content ── */}
      {tab === 'Content' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Models, Common Issues & Content Sections</h2>
          <p className="text-xs text-[#6b7280]">
            The services list on this page is pulled live from service_brands — it is not editable
            here. Everything below is JSON edited directly.
          </p>
          <JsonSaveField
            label="Models (JSON array of strings)"
            value={brand.models}
            onSave={(val) => saveJson('models', val)}
          />
          <JsonSaveField
            label={'Common Issues (JSON array of { "issue", "description" })'}
            value={brand.common_issues}
            onSave={(val) => saveJson('common_issues', val)}
          />
          <JsonSaveField
            label={'Content Sections (JSON array of { "heading", "body" })'}
            value={brand.sections}
            onSave={(val) => saveJson('sections', val)}
          />
        </div>
      )}

      {/* ── FAQs ── */}
      {tab === 'FAQs' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">FAQs</h2>
          <JsonSaveField
            label={'FAQs (JSON array of { "q", "a" })'}
            value={brand.faqs}
            onSave={(val) => saveJson('faqs', val)}
          />
        </div>
      )}

      {tab === 'Preview' && (
        <LivePagePreview
          title={`Brand preview — ${String(brand.brand_name ?? brandSlug)}`}
          url={liveUrl}
          description="Loads the real brand page from the Fiixup frontend. Save changes first, then reload the preview to check the live layout."
        />
      )}
    </div>
  )
}

// ─── Reusable JSON save field (matches Services editor's local helper) ────────
function JsonSaveField({
  label,
  value,
  onSave,
}: {
  label: string
  value: unknown
  onSave: (val: string) => void
}) {
  const [text, setText] = useState(JSON.stringify(value ?? [], null, 2))
  const [error, setError] = useState('')
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

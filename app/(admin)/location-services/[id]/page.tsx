'use client'
// app/(admin)/location-services/[id]/page.tsx
// COMPLETE Location Service editor — ALL related tables:
// location_services + ls_pricing_rows + ls_testimonials + ls_faqs
// ls_nearby_areas + ls_related_services + service_images
// review_sources + seo_pages + page_analytics

import { useEffect, useState, useCallback } from 'react'
import { useParams }        from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { Field }            from '@/components/ui/Field'
import { SeoMetaPanel }     from '@/components/seo/SeoMetaPanel'
import { SchemaMultiSelector } from '@/components/schema/SchemaMultiSelector'
import { AdminBackButton }  from '@/components/navigation/AdminBackButton'
import { LivePagePreview } from '@/components/preview/LivePagePreview'
import {
  FaqLibraryPicker,
  GlobalReviewPicker,
  RelatedServicePicker,
} from '@/components/location-services/editor/LocationServiceContentPickers'
import { publicSiteUrl } from '@/lib/public-site'
import type { SchemaEntityType } from '@/utils/schema/schemaTypes'
import { showToast }        from '@/components/ui/Toast'
import {
  ArrowLeft, ExternalLink, RefreshCw, Loader2,
  Globe, BarChart2,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  AddBtn,
  ChildRow,
  Empty,
  ImagePickerTab,
  JsonField,
  NearbyAreasPicker,
  SectionHeader,
  Toggle,
  s,
} from '@/components/location-services/editor/LocationServiceEditorParts'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'seo',         label: 'SEO'         },
  { id: 'preview',     label: 'Preview'     },
  { id: 'hero',        label: 'Hero'        },
  { id: 'about',       label: 'About'       },
  { id: 'pricing',     label: 'Pricing'     },
  { id: 'review',      label: 'Review'      },
  { id: 'faqs',        label: 'FAQs'        },
  { id: 'nearby',      label: 'Nearby Areas'},
  { id: 'related',     label: 'Related'     },
  { id: 'images',      label: 'Images'      },
  { id: 'schema',      label: 'Schema'      },
  { id: 'seo_content', label: 'SEO Content' },
  { id: 'analytics',   label: 'Analytics'  },
] as const
type TabId = typeof TABS[number]['id']

type Row = Record<string, unknown>

export default function LSEditorPage() {
  const { id }  = useParams() as { id: string }
  const sb      = getBrowserClient()

  const [tab,      setTab]      = useState<TabId>('seo')
  const [loading,  setLoading]  = useState(true)
  const [ls,       setLs]       = useState<Row | null>(null)
  const [pricing,  setPricing]  = useState<Row[]>([])
  const [tests,    setTests]    = useState<Row[]>([])
  const [faqs,     setFaqs]     = useState<Row[]>([])
  const [nearby,   setNearby]   = useState<Row[]>([])
  const [related,  setRelated]  = useState<Row[]>([])
  const [images,   setImages]   = useState<Row[]>([])
  const [seoPage,  setSeoPage]  = useState<Row | null>(null)
  const [analytics,setAnalytics]= useState<Row | null>(null)

  // ── Fetch ALL ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: lsData } = await sb
      .from('location_services').select('*').eq('id', id).single()
    if (!lsData) { setLoading(false); return }
    setLs(lsData)

    const [p, t, f, n, r, img, sp] = await Promise.all([
      sb.from('ls_pricing_rows')    .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_testimonials')    .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_faqs')            .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_nearby_areas')    .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_related_services').select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('service_images')     .select('*').eq('ls_id', id).order('sort_order'),
      sb.from('seo_pages')          .select('*').eq('location_service_id', id).single(),
    ])

    setPricing (p.data   ?? [])
    setTests   (t.data   ?? [])
    setFaqs    (f.data   ?? [])
    setNearby  (n.data   ?? [])
    setRelated (r.data   ?? [])
    setImages  (img.data ?? [])
    setSeoPage (sp.data  ?? null)

    // Fetch page_analytics if seo_page exists
    if (sp.data?.url_path) {
      const { data: an } = await sb
        .from('page_analytics').select('*').eq('url_path', sp.data.url_path).single()
      setAnalytics(an ?? null)
    }

    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!ls) return <div className="text-red-400 p-8">Location service not found: {id}</div>

  // ── Save LS column ─────────────────────────────────────────────────────────
  const saveLS = (col: string) => async (val: unknown) => {
    const { error } = await sb.from('location_services')
      .update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setLs(p => p ? { ...p, [col]: val } : p)
    showToast('success', `Saved — seo_pages rebuilding automatically`)
    return { success: true, message: 'Saved' }
  }

  const saveLSNum = (col: string) => async (val: string) => {
    const num = parseFloat(val) || 0
    const { error } = await sb.from('location_services')
      .update({ [col]: num, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setLs(p => p ? { ...p, [col]: num } : p)
    showToast('success', 'Saved')
    return { success: true, message: 'Saved' }
  }

  const saveLSJson = (col: string) => async (val: string) => {
    try {
      const parsed = JSON.parse(val)
      const { error } = await sb.from('location_services')
        .update({ [col]: parsed, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) { showToast('error', error.message); return { success: false, error: error.message } }
      setLs(p => p ? { ...p, [col]: parsed } : p)
      showToast('success', 'Saved')
      return { success: true, message: 'Saved' }
    } catch { return { success: false, error: 'Invalid JSON' } }
  }

  const saveLSPatch = async (patch: Record<string, unknown>) => {
    const { error } = await sb.from('location_services')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setLs(p => p ? { ...p, ...patch } : p)
    return { success: true, message: 'Schema saved' }
  }

  const saveLSBool = async (col: string, val: boolean) => {
    const { error } = await sb.from('location_services')
      .update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return }
    setLs(p => p ? { ...p, [col]: val } : p)
    showToast('success', 'Saved')
  }

  // Child tables remain editable for compatibility, while location_services is
  // the master source used by the seo_pages sync trigger and live frontend.
  const syncTestimonials = async () => {
    const { data, error } = await sb.from('ls_testimonials')
      .select('*').eq('location_service_id', id).order('sort_order')
    if (error) { showToast('error', error.message); await fetchAll(); return }

    const testimonials = (data ?? []).slice(0, 1).map((row) => ({
      name: s(row.name),
      text: s(row.body),
      body: s(row.body),
      rating: Math.max(1, Math.min(5, Number(row.rating) || 5)),
      vehicle: s(row.vehicle),
      area: s(row.area),
      source: s(row.source),
      verified: Boolean(row.verified),
    }))

    const { error: updateError } = await sb.from('location_services')
      .update({ testimonials, updated_at: new Date().toISOString() }).eq('id', id)
    if (updateError) showToast('error', `Review saved locally but master sync failed: ${updateError.message}`)
    await fetchAll()
  }

  const syncFaqs = async () => {
    const { data, error } = await sb.from('ls_faqs')
      .select('*').eq('location_service_id', id).order('sort_order')
    if (error) { showToast('error', error.message); await fetchAll(); return }

    const faqPayload = (data ?? []).map((row) => ({
      question: s(row.question),
      answer: s(row.answer),
    }))

    const { error: updateError } = await sb.from('location_services')
      .update({ faqs: faqPayload, updated_at: new Date().toISOString() }).eq('id', id)
    if (updateError) showToast('error', `FAQ saved locally but master sync failed: ${updateError.message}`)
    await fetchAll()
  }

  const syncRelatedServices = async () => {
    const { data, error } = await sb.from('ls_related_services')
      .select('*').eq('location_service_id', id).order('sort_order')
    if (error) { showToast('error', error.message); await fetchAll(); return }

    const relatedServices = (data ?? []).map((row) => ({
      name: s(row.name),
      slug: s(row.slug),
      category: s(row.category),
    }))

    const { error: updateError } = await sb.from('location_services')
      .update({ related_services: relatedServices, updated_at: new Date().toISOString() }).eq('id', id)
    if (updateError) showToast('error', `Related service saved locally but master sync failed: ${updateError.message}`)
    await fetchAll()
  }

  const liveUrl = s(ls.canonical_url).startsWith('http')
    ? s(ls.canonical_url)
    : publicSiteUrl(`/${s(ls.city_slug)}${s(ls.area_slug) ? '/'+s(ls.area_slug) : ''}/${s(ls.service_slug)}`)

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBackButton fallbackHref="/location-services"
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </AdminBackButton>
          <div>
            <h1 className="admin-page-title">{s(ls.service_name)}</h1>
            <div className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="bg-[#2a2d3e] px-2 py-0.5 rounded-full">{s(ls.city_slug)}</span>
              <span className="bg-[#2a2d3e] px-2 py-0.5 rounded-full">{s(ls.service_category)}</span>
              {s(ls.area_slug) && <span className="bg-[#2a2d3e] px-2 py-0.5 rounded-full">📍 {s(ls.area_slug)}</span>}
              {ls.is_city_level
                ? <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full text-xs">City-level</span>
                : <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full text-xs">Area-level</span>}
              <Toggle value={Boolean(ls.is_active)} onChange={v => saveLSBool('is_active', v)} label="Active" />
            </div>
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

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { label: 'Pricing', count: pricing.length,       color: 'blue'   },
          { label: 'Review',  count: tests.length ? 1 : 0, color: 'yellow' },
          { label: 'FAQs',    count: faqs.length,          color: 'green'  },
          { label: 'Nearby',  count: nearby.length,        color: 'purple' },
          { label: 'Related', count: related.length,       color: 'orange' },
          { label: 'Images',  count: images.length,        color: 'pink'   },
        ].map(s => (
          <div key={s.label} className="admin-card px-3 py-2 text-center">
            <p className="text-lg font-bold text-[#e2e8f0]">{s.count}</p>
            <p className="text-xs text-[#6b7280]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              tab === t.id ? 'tab-active' : 'tab-inactive')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ SEO ══════════════ */}
      {tab === 'seo' && (
        <SeoMetaPanel
          title={s(ls.meta_title)}
          description={s(ls.meta_description)}
          keywords={s(ls.meta_keywords)}
          urlPath={s(ls.canonical_url) || `/${s(ls.city_slug)}${s(ls.area_slug) ? '/' + s(ls.area_slug) : ''}/${s(ls.service_slug)}`}
          onSaveTitle={saveLS('meta_title')}
          onSaveDescription={saveLS('meta_description')}
          onSaveKeywords={saveLS('meta_keywords')}
          extraFields={
            <>
              <Field label="Canonical URL" value={s(ls.canonical_url)} onSave={saveLS('canonical_url')} />
              <Field label="OG Image URL"  value={s(ls.og_image_url)}  onSave={saveLS('og_image_url')} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Schema Rating"       value={s(ls.schema_aggregate_rating)} numeric onSave={saveLSNum('schema_aggregate_rating')} />
                <Field label="Schema Review Count" value={s(ls.schema_review_count)}     numeric onSave={saveLSNum('schema_review_count')} />
              </div>

              {/* SEO Page status (read-only) */}
              {seoPage && (
                <div className="bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-4 mt-2">
                  <p className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" /> SEO Page Status
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[#6b7280] text-xs">URL Path</p>
                      <p className="text-[#e2e8f0] font-mono text-xs mt-0.5">{s(seoPage.url_path)}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] text-xs">Page Type</p>
                      <p className="text-[#e2e8f0] text-xs mt-0.5">{s(seoPage.page_type)}</p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] text-xs">Indexed</p>
                      <p className={clsx('text-xs font-semibold mt-0.5', seoPage.is_indexed ? 'text-green-400' : 'text-red-400')}>
                        {seoPage.is_indexed ? '✓ Yes' : '✗ No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#6b7280] text-xs">Last Updated</p>
                      <p className="text-[#e2e8f0] text-xs mt-0.5">
                        {new Date(s(seoPage.updated_at)).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
        />
      )}

      {/* ══════════════ PREVIEW ══════════════ */}
      {tab === 'preview' && (
        <LivePagePreview
          title={`Location service preview — ${s(ls.service_name)}`}
          url={liveUrl}
          description="Loads the real Fiixup location-service page. Save changes first, then reload the preview to verify the live layout."
        />
      )}


      {/* ══════════════ HERO ══════════════ */}
      {tab === 'hero' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Hero Section</h2>
          <Field label="Hero Heading"    value={s(ls.hero_heading)}    onSave={saveLS('hero_heading')} multiline rows={2} />
          <Field label="Hero Subheading" value={s(ls.hero_subheading)} onSave={saveLS('hero_subheading')} multiline rows={3} />
          <Field label="Hero Badge Text" value={s(ls.hero_badge_text)} onSave={saveLS('hero_badge_text')} />
          <Field label="Hero Image URL"  value={s(ls.hero_image_url)}  onSave={saveLS('hero_image_url')} />
          <Field label="Hero Image Alt"  value={s(ls.hero_image_alt)}  onSave={saveLS('hero_image_alt')} />
        </div>
      )}

      {/* ══════════════ ABOUT ══════════════ */}
      {tab === 'about' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">About Section</h2>
          <Field label="About Heading"    value={s(ls.about_heading)} onSave={saveLS('about_heading')} />
          <Field label="About Paragraph 1" value={s(ls.about_para1)} onSave={saveLS('about_para1')} multiline rows={5} />
          <Field label="About Paragraph 2" value={s(ls.about_para2)} onSave={saveLS('about_para2')} multiline rows={5} />
          <JsonField label="About Bullets [{heading,text}]"      value={ls.about_bullets}      onSave={saveLSJson('about_bullets')} />
          <JsonField label="Service Highlights [{title,description}]" value={ls.service_highlights} onSave={saveLSJson('service_highlights')} />
          <JsonField label="Why Choose Points [{icon,title,desc}]"    value={ls.why_choose_points}  onSave={saveLSJson('why_choose_points')} />
          <JsonField label="Process Steps [{step,title,desc}]"        value={ls.process_steps}      onSave={saveLSJson('process_steps')} />
        </div>
      )}

      {/* ══════════════ PRICING ══════════════ */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <div className="admin-card p-4">
            <Field label="Pricing Disclaimer" value={s(ls.pricing_disclaimer)} onSave={saveLS('pricing_disclaimer')} multiline rows={2} />
          </div>
          <SectionHeader title="Pricing Rows" count={pricing.length}>
            <AddBtn table="ls_pricing_rows" parentKey="location_service_id" parentId={id}
              fields={[
                { key: 'label',      label: 'Label',          type: 'text',    required: true },
                { key: 'price_from', label: 'Price From (₹)', type: 'number',  required: true },
                { key: 'price_to',   label: 'Price To (₹)',   type: 'number'  },
                { key: 'note',       label: 'Note',           type: 'text'    },
                { key: 'highlight',  label: 'Highlight (true/false)', type: 'text' },
                { key: 'sort_order', label: 'Sort Order',     type: 'number'  },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {pricing.length === 0 && <Empty>No pricing rows yet. Add one above.</Empty>}
          {pricing.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_pricing_rows"
              preview={`${s(row.label)} — ₹${s(row.price_from)}${row.price_to ? `–₹${s(row.price_to)}` : '+'}`}
              fields={[
                { key: 'label',      label: 'Label',          type: 'text'   },
                { key: 'price_from', label: 'Price From (₹)', type: 'number' },
                { key: 'price_to',   label: 'Price To (₹)',   type: 'number' },
                { key: 'note',       label: 'Note',           type: 'textarea'},
                { key: 'highlight',  label: 'Highlight',      type: 'boolean'},
                { key: 'sort_order', label: 'Sort Order',     type: 'number' },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ══════════════ REVIEW ══════════════ */}
      {tab === 'review' && (
        <GlobalReviewPicker
          locationServiceId={id}
          existing={tests}
          onRefresh={syncTestimonials}
        />
      )}

      {/* ══════════════ FAQs ══════════════ */}
      {tab === 'faqs' && (
        <div className="space-y-4">
          <FaqLibraryPicker
            locationServiceId={id}
            serviceSlug={s(ls.service_slug)}
            serviceCategory={s(ls.service_category)}
            citySlug={s(ls.city_slug)}
            areaSlug={s(ls.area_slug)}
            existing={faqs}
            onRefresh={syncFaqs}
          />

          <SectionHeader title="Service FAQs" count={faqs.length}>
            <span className="text-xs text-[#6b7280]">Edit or remove added FAQs below</span>
          </SectionHeader>
          {faqs.length === 0 && <Empty>No FAQs yet. Choose from the library or create a specific FAQ above.</Empty>}
          {faqs.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_faqs"
              preview={s(row.question).slice(0, 80)}
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea'},
                { key: 'answer',     label: 'Answer',     type: 'textarea'},
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onSave={syncFaqs}
            />
          ))}
        </div>
      )}

      {/* ══════════════ NEARBY AREAS ══════════════ */}
      {tab === 'nearby' && (
        <NearbyAreasPicker
          lsId={id}
          citySlug={s(ls.city_slug)}
          existing={nearby}
          onRefresh={fetchAll}
        />
      )}

      {/* ══════════════ RELATED SERVICES ══════════════ */}
      {tab === 'related' && (
        <div className="space-y-4">
          <RelatedServicePicker
            locationServiceId={id}
            citySlug={s(ls.city_slug)}
            areaSlug={s(ls.area_slug)}
            currentServiceSlug={s(ls.service_slug)}
            isCityLevel={Boolean(ls.is_city_level)}
            existing={related}
            onRefresh={syncRelatedServices}
          />

          <SectionHeader title="Selected Related Services" count={related.length}>
            <span className="text-xs text-[#6b7280]">Edit order or remove selections below</span>
          </SectionHeader>
          {related.length === 0 && <Empty>No related services selected yet.</Empty>}
          {related.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_related_services"
              preview={`${s(row.name)} → ${Boolean(ls.is_city_level)
                ? `/${s(ls.city_slug)}/${s(row.slug)}`
                : `/${s(ls.city_slug)}/${s(ls.area_slug)}/${s(row.slug)}`}`}
              fields={[
                { key: 'name',       label: 'Service Name', type: 'text'   },
                { key: 'slug',       label: 'Service Slug', type: 'text'   },
                { key: 'category',   label: 'Category',     type: 'text'   },
                { key: 'sort_order', label: 'Sort Order',   type: 'number' },
              ]}
              onSave={syncRelatedServices}
            />
          ))}
        </div>
      )}

      {/* ══════════════ IMAGES ══════════════ */}
      {tab === 'images' && (
        <ImagePickerTab
          lsId={id}
          images={images}
          onRefresh={fetchAll}
        />
      )}

      {/* ══════════════ SCHEMA ══════════════ */}
      {tab === 'schema' && (
        <SchemaMultiSelector
          kind="locationService"
          record={ls}
          urlPath={s(ls.canonical_url) || `/${s(ls.city_slug)}${s(ls.area_slug) ? '/' + s(ls.area_slug) : ''}/${s(ls.service_slug)}`}
          faqs={faqs}
          selectedTypes={(Array.isArray(ls.schema_types) ? ls.schema_types : undefined) as SchemaEntityType[] | undefined}
          overrides={(ls.schema_overrides && typeof ls.schema_overrides === 'object' ? ls.schema_overrides : {}) as Record<string, unknown>}
          onSave={saveLSPatch}
        />
      )}

      {/* ══════════════ SEO CONTENT ══════════════ */}
      {tab === 'seo_content' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Long-Form SEO Content</h2>
          <Field label="SEO Intro Heading" value={s(ls.seo_intro_heading)} onSave={saveLS('seo_intro_heading')} />
          <Field label="SEO Intro Body"    value={s(ls.seo_intro_body)}    onSave={saveLS('seo_intro_body')} multiline rows={6} />
          <Field label="SEO Conclusion"    value={s(ls.seo_conclusion)}    onSave={saveLS('seo_conclusion')} multiline rows={4} />
          <JsonField
            label="SEO Sections [{heading, body}]"
            value={ls.seo_sections}
            onSave={saveLSJson('seo_sections')}
          />
        </div>
      )}

      {/* ══════════════ ANALYTICS ══════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="admin-card p-6">
            <h2 className="admin-section-title flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-blue-400" /> Page Analytics
            </h2>
            {seoPage ? (
              <>
                <div className="text-xs font-mono text-[#6b7280] mb-4 bg-[#0f1117] px-3 py-2 rounded-lg">
                  {s(seoPage.url_path)}
                </div>
                {analytics ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Impressions',   value: s(analytics.impressions)   || '—' },
                      { label: 'Clicks',        value: s(analytics.clicks)        || '—' },
                      { label: 'Avg Position',  value: analytics.avg_position ? `#${s(analytics.avg_position)}` : '—' },
                      { label: 'Crawl Count',   value: s(analytics.crawl_count)   || '—' },
                      { label: 'Index Status',  value: s(analytics.index_status)  || '—' },
                      { label: 'TTFB (ms)',     value: s(analytics.core_web_ttfb) || '—' },
                      { label: 'Last Crawled',  value: analytics.last_crawled ? new Date(s(analytics.last_crawled)).toLocaleDateString('en-IN') : '—' },
                      { label: 'Updated',       value: analytics.updated_at ? new Date(s(analytics.updated_at)).toLocaleDateString('en-IN') : '—' },
                    ].map(item => (
                      <div key={item.label} className="bg-[#0f1117] rounded-xl p-4 text-center">
                        <p className="text-lg font-bold text-[#e2e8f0]">{item.value}</p>
                        <p className="text-xs text-[#6b7280] mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#6b7280]">
                    <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No analytics data yet.</p>
                    <p className="text-xs mt-1">Connect Google Search Console to populate this data.</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[#6b7280] text-sm">No seo_pages entry found for this location service.</p>
            )}
          </div>

          {/* SEO page flags (editable) */}
          {seoPage && (
            <div className="admin-card p-6">
              <h2 className="admin-section-title mb-4">Indexing Flags</h2>
              <div className="space-y-3">
                {['is_active', 'is_indexed'].map(col => (
                  <div key={col} className="flex items-center justify-between py-2 border-b border-[#2a2d3e] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#e2e8f0]">{col}</p>
                      <p className="text-xs text-[#6b7280]">
                        {col === 'is_active'  ? 'Show this page on the site' : 'Allow search engines to index this page'}
                      </p>
                    </div>
                    <Toggle
                      value={Boolean(seoPage[col])}
                      onChange={async (val) => {
                        const { error } = await sb.from('seo_pages')
                          .update({ [col]: val }).eq('url_path', seoPage.url_path)
                        if (error) { showToast('error', error.message); return }
                        setSeoPage(p => p ? { ...p, [col]: val } : p)
                        showToast('success', `${col} updated`)
                      }}
                      label=""
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

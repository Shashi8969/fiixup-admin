'use client'
// app/(admin)/global-service-pages/[id]/page.tsx
// Editor for global_service_pages — standalone national/city-named pages
// (e.g. /bangalore-towing-service) with no admin UI before this.

import { useEffect, useState, useCallback } from 'react'
import { useParams }        from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { Field }            from '@/components/ui/Field'
import { ImagePickerField } from '@/components/media/ImagePickerField'
import { SeoMetaPanel }     from '@/components/seo/SeoMetaPanel'
import { SchemaMultiSelector } from '@/components/schema/SchemaMultiSelector'
import { AdminBackButton }  from '@/components/navigation/AdminBackButton'
import { LivePagePreview }  from '@/components/preview/LivePagePreview'
import { ReviewLibraryPicker } from '@/components/location-services/editor/LocationServiceContentPickers'
import { publicSiteUrl } from '@/lib/public-site'
import type { SchemaEntityType } from '@/utils/schema/schemaTypes'
import { showToast } from '@/components/ui/Toast'
import {
  saveGlobalServicePage,
  saveGspPricingRow, addGspPricingRow, deleteGspPricingRow,
  saveGspFaq,        addGspFaq,        deleteGspFaq,
} from '@/lib/actions'
import {
  ArrowLeft, Globe, Loader2, RefreshCw, ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  AddRowBtn, ChildRow, Empty, SectionHeader, Toggle, s,
  DirectAddBtn, DirectChildRow,
} from '@/components/city-service-pages/editor/CityServicePageEditorParts'
import { JsonArrayBuilder } from '@/components/ui/JsonArrayBuilder'

const TABS = [
  { id: 'seo',          label: 'SEO'          },
  { id: 'preview',      label: 'Preview'      },
  { id: 'hero',         label: 'Hero'         },
  { id: 'schema',       label: 'Schema'       },
  { id: 'about',        label: 'About'        },
  { id: 'json',         label: 'JSON Fields'  },
  { id: 'pricing',      label: 'Pricing'      },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'faqs',         label: 'FAQs'         },
  { id: 'related',      label: 'Related'      },
  { id: 'seo_content',  label: 'SEO Content'  },
] as const
type TabId = typeof TABS[number]['id']

type Row = Record<string, unknown>

export default function GlobalServicePageEditor() {
  const { id: gspId } = useParams() as { id: string }
  const sb = getBrowserClient()

  const [gsp,     setGsp]     = useState<Row | null>(null)
  const [pricing, setPricing] = useState<Row[]>([])
  const [tests,   setTests]   = useState<Row[]>([])
  const [faqs,    setFaqs]    = useState<Row[]>([])
  const [related, setRelated] = useState<Row[]>([])
  const [tab,     setTab]     = useState<TabId>('seo')
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('global_service_pages').select('*').eq('id', gspId).single()
    if (!data) { setLoading(false); return }
    setGsp(data)

    const [p, t, f, r] = await Promise.all([
      sb.from('gsp_pricing_rows')     .select('*').eq('gsp_id', gspId).order('sort_order'),
      sb.from('gsp_testimonials')     .select('*').eq('gsp_id', gspId).order('sort_order'),
      sb.from('gsp_faqs')             .select('*').eq('gsp_id', gspId).order('sort_order'),
      sb.from('gsp_related_services') .select('*').eq('gsp_id', gspId).order('sort_order'),
    ])
    setPricing(p.data ?? [])
    setTests  (t.data ?? [])
    setFaqs   (f.data ?? [])
    setRelated(r.data ?? [])
    setLoading(false)
  }, [gspId])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  )
  if (!gsp) return <div className="text-red-400 p-8">Page not found: {gspId}</div>

  const serviceSlug = s(gsp.service_slug)
  const liveUrl = s(gsp.canonical_url) || publicSiteUrl(`/${serviceSlug}`)

  const save = (field: string) => async (val: unknown) => {
    const r = await saveGlobalServicePage(gspId, serviceSlug, { [field]: val })
    if (r.success) { setGsp(p => p ? { ...p, [field]: val } : p); showToast('success', r.message) }
    else showToast('error', r.error)
    return r
  }
  const saveBool = async (field: string, val: boolean) => {
    const r = await saveGlobalServicePage(gspId, serviceSlug, { [field]: val })
    if (r.success) { setGsp(p => p ? { ...p, [field]: val } : p); showToast('success', r.message) }
    else showToast('error', r.error)
  }
  const savePatch = async (patch: Record<string, unknown>) => {
    const r = await saveGlobalServicePage(gspId, serviceSlug, patch)
    if (r.success) setGsp(p => p ? { ...p, ...patch } : p)
    return r
  }
  const saveJson = (field: string) => async (val: string) => {
    try {
      const parsed = JSON.parse(val)
      const r = await saveGlobalServicePage(gspId, serviceSlug, { [field]: parsed })
      if (r.success) { setGsp(p => p ? { ...p, [field]: parsed } : p); showToast('success', r.message) }
      else showToast('error', r.error)
      return r
    } catch { return { success: false as const, error: 'Invalid JSON' } }
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBackButton fallbackHref="/global-service-pages"
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </AdminBackButton>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              {s(gsp.service_name)}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full">
                /{serviceSlug}
              </span>
              <Toggle value={Boolean(gsp.is_active)}   onChange={v => saveBool('is_active', v)}   label="Active" />
              <Toggle value={Boolean(gsp.is_indexed)}  onChange={v => saveBool('is_indexed', v)}  label="Indexed" />
              <Toggle value={Boolean(gsp.is_featured)} onChange={v => saveBool('is_featured', v)} label="Featured" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Pricing Rows', count: pricing.length },
          { label: 'Testimonials', count: tests.length   },
          { label: 'FAQs',         count: faqs.length    },
          { label: 'Related Svcs', count: related.length },
        ].map(item => (
          <div key={item.label} className="admin-card px-3 py-2 text-center">
            <p className="text-lg font-bold text-[#e2e8f0]">{item.count}</p>
            <p className="text-xs text-[#6b7280]">{item.label}</p>
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

      {/* ════════════ SEO ════════════ */}
      {tab === 'seo' && (
        <SeoMetaPanel
          title={s(gsp.meta_title)}
          description={s(gsp.meta_description)}
          keywords={s(gsp.meta_keywords)}
          urlPath={`/${serviceSlug}`}
          onSaveTitle={save('meta_title')}
          onSaveDescription={save('meta_description')}
          onSaveKeywords={save('meta_keywords')}
          extraFields={
            <>
              <Field label="Canonical URL" value={s(gsp.canonical_url)} onSave={save('canonical_url')} />
              <ImagePickerField label="OG Image URL" value={s(gsp.og_image_url)} onSave={save('og_image_url')} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Service Category" value={s(gsp.service_category)} onSave={save('service_category')} />
                <Field label="Service Duration" value={s(gsp.service_duration)} onSave={save('service_duration')} />
              </div>
              <p className="text-xs text-[#475569]">
                Rating/review-count fields were removed from this panel: Google&apos;s self-serving-reviews
                policy means admin-authored ratings never produce star rich results for LocalBusiness schema
                regardless of the numbers here — see the Schema tab.
              </p>
            </>
          }
        />
      )}

      {/* ════════════ PREVIEW ════════════ */}
      {tab === 'preview' && (
        <LivePagePreview
          title={`Global page preview — ${s(gsp.service_name)}`}
          url={liveUrl}
          description="Loads the real Fiixup frontend page for this route. Save changes first, then reload to check the design."
        />
      )}

      {/* ════════════ SCHEMA ════════════ */}
      {tab === 'schema' && (
        <div className="space-y-3">
          <p className="text-xs text-[#475569] px-1">
            The live page always serves a real, DB-generated Service + LocalBusiness (+ FAQPage, if you have FAQs)
            with a genuine address/geo and no self-serving rating — see <code className="text-blue-400">trg_fn_gsp_schema()</code>.
            Selected types/overrides below are additive polish on top of that base, not a replacement for it.
          </p>
          <SchemaMultiSelector
            kind="globalService"
            record={gsp}
            urlPath={`/${serviceSlug}`}
            faqs={faqs}
            selectedTypes={(Array.isArray(gsp.schema_types) ? gsp.schema_types : undefined) as SchemaEntityType[] | undefined}
            overrides={(gsp.schema_overrides && typeof gsp.schema_overrides === 'object' ? gsp.schema_overrides : {}) as Record<string, unknown>}
            onSave={savePatch}
          />
        </div>
      )}

      {/* ════════════ HERO ════════════ */}
      {tab === 'hero' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Hero Section</h2>
          <Field label="Hero Heading"    value={s(gsp.hero_heading)}    onSave={save('hero_heading')} multiline rows={2} />
          <Field label="Hero Subheading" value={s(gsp.hero_subheading)} onSave={save('hero_subheading')} multiline rows={3} />
          <Field label="Hero Badge Text" value={s(gsp.hero_badge_text)} onSave={save('hero_badge_text')} />
          <ImagePickerField
            label="Hero Image URL" value={s(gsp.hero_image_url)} onSave={save('hero_image_url')}
            altLabel="Hero Image Alt" altValue={s(gsp.hero_image_alt)} onSaveAlt={save('hero_image_alt')}
          />
        </div>
      )}

      {/* ════════════ ABOUT ════════════ */}
      {tab === 'about' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">About Section</h2>
          <Field label="About Heading"     value={s(gsp.about_heading)} onSave={save('about_heading')} />
          <Field label="About Paragraph 1" value={s(gsp.about_para1)}   onSave={save('about_para1')} multiline rows={5} />
          <Field label="About Paragraph 2" value={s(gsp.about_para2)}   onSave={save('about_para2')} multiline rows={5} />
          <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
            <Field label="Pricing Intro"      value={s(gsp.pricing_intro)}      onSave={save('pricing_intro')} multiline rows={2} />
            <Field label="Pricing Disclaimer" value={s(gsp.pricing_disclaimer)} onSave={save('pricing_disclaimer')} multiline rows={2} />
          </div>
        </div>
      )}

      {/* ════════════ JSON FIELDS ════════════ */}
      {tab === 'json' && (
        <div className="space-y-4">
          <div className="admin-card p-4">
            <p className="text-xs text-[#6b7280]">
              These store structured content as JSON arrays. Edit carefully — invalid JSON will not save.
            </p>
          </div>
          {[
            {
              field: 'about_bullets', label: 'About Bullets', itemNoun: 'bullet',
              fields: [{ key: 'heading', label: 'Heading' }, { key: 'text', label: 'Text', type: 'textarea' as const }],
            },
            {
              field: 'service_highlights', label: 'Service Highlights', itemNoun: 'highlight',
              fields: [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description', type: 'textarea' as const }],
            },
            {
              field: 'why_choose_points', label: 'Why Choose Points', itemNoun: 'point',
              fields: [{ key: 'icon', label: 'Icon (lucide name)' }, { key: 'title', label: 'Title' }, { key: 'desc', label: 'Description', type: 'textarea' as const }],
            },
            {
              field: 'process_steps', label: 'Process Steps', itemNoun: 'step',
              fields: [{ key: 'step', label: 'Step Number/Label' }, { key: 'title', label: 'Title' }, { key: 'desc', label: 'Description', type: 'textarea' as const }],
            },
            {
              field: 'hero_stats', label: 'Hero Stats', itemNoun: 'stat',
              fields: [{ key: 'value', label: 'Value (e.g. 10,000+)' }, { key: 'label', label: 'Label' }],
            },
          ].map(({ field, label, itemNoun, fields }) => (
            <div key={field} className="admin-card p-5">
              <JsonArrayBuilder label={label} itemNoun={itemNoun} fields={fields} value={gsp[field]} onSave={saveJson(field)} />
            </div>
          ))}
        </div>
      )}

      {/* ════════════ PRICING ════════════ */}
      {tab === 'pricing' && (
        <div className="space-y-4">
          <SectionHeader title="Pricing Rows" count={pricing.length}>
            <AddRowBtn
              fields={[
                { key: 'label',      label: 'Label',          type: 'text',   required: true },
                { key: 'price_from', label: 'Price From (₹)', type: 'number', required: true },
                { key: 'price_to',   label: 'Price To (₹)',   type: 'number' },
                { key: 'note',       label: 'Note',           type: 'text'   },
                { key: 'sort_order', label: 'Sort Order',     type: 'number' },
              ]}
              onAdd={async data => {
                const r = await addGspPricingRow(gspId, serviceSlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
            />
          </SectionHeader>
          {pricing.length === 0 && <Empty>No pricing rows yet.</Empty>}
          {pricing.map(row => (
            <ChildRow key={s(row.id)} row={row}
              preview={`${s(row.label)} — ₹${s(row.price_from)}${row.price_to ? `–₹${s(row.price_to)}` : '+'}`}
              fields={[
                { key: 'label',      label: 'Label',          type: 'text'    },
                { key: 'price_from', label: 'Price From (₹)', type: 'number'  },
                { key: 'price_to',   label: 'Price To (₹)',   type: 'number'  },
                { key: 'note',       label: 'Note',           type: 'textarea'},
                { key: 'highlight',  label: 'Highlight',      type: 'boolean' },
                { key: 'sort_order', label: 'Sort Order',     type: 'number'  },
              ]}
              onSave={async (rowId, data) => {
                const r = await saveGspPricingRow(rowId, gspId, serviceSlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
              onDelete={async rowId => {
                const r = await deleteGspPricingRow(rowId, gspId, serviceSlug)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
            />
          ))}
        </div>
      )}

      {/* ════════════ TESTIMONIALS ════════════ */}
      {tab === 'testimonials' && (
        <ReviewLibraryPicker
          target={{
            table: 'gsp_testimonials',
            idColumn: 'gsp_id',
            id: gspId,
            locationField: 'location',
            scopeLabel: 'page',
          }}
          existing={tests}
          onRefresh={fetchAll}
        />
      )}

      {/* ════════════ FAQs ════════════ */}
      {tab === 'faqs' && (
        <div className="space-y-4">
          <SectionHeader title="FAQs" count={faqs.length}>
            <AddRowBtn
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea', required: true },
                { key: 'answer',     label: 'Answer',     type: 'textarea', required: true },
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onAdd={async data => {
                const r = await addGspFaq(gspId, serviceSlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
            />
          </SectionHeader>
          {faqs.length === 0 && <Empty>No FAQs yet.</Empty>}
          {faqs.map(row => (
            <ChildRow key={s(row.id)} row={row}
              preview={s(row.question).slice(0, 80)}
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea' },
                { key: 'answer',     label: 'Answer',     type: 'textarea' },
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onSave={async (rowId, data) => {
                const r = await saveGspFaq(rowId, gspId, serviceSlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
              onDelete={async rowId => {
                const r = await deleteGspFaq(rowId, gspId, serviceSlug)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
            />
          ))}
        </div>
      )}

      {/* ════════════ RELATED SERVICES ════════════ */}
      {tab === 'related' && (
        <div className="space-y-4">
          <SectionHeader title="Related Services" count={related.length}>
            <DirectAddBtn
              table="gsp_related_services"
              parentKey="gsp_id"
              parentId={gspId}
              fields={[
                { key: 'name',       label: 'Name',        type: 'text',   required: true },
                { key: 'slug',       label: 'Slug',        type: 'text',   required: true },
                { key: 'category',   label: 'Category',    type: 'text'   },
                { key: 'sort_order', label: 'Sort Order',  type: 'number' },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {related.length === 0 && <Empty>No related services yet.</Empty>}
          {related.map(row => (
            <DirectChildRow key={s(row.id)} row={row} table="gsp_related_services"
              preview={`${s(row.name)} (${s(row.slug)})`}
              fields={[
                { key: 'name',       label: 'Name',       type: 'text'   },
                { key: 'slug',       label: 'Slug',       type: 'text'   },
                { key: 'category',   label: 'Category',   type: 'text'   },
                { key: 'sort_order', label: 'Sort Order', type: 'number' },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ════════════ SEO CONTENT ════════════ */}
      {tab === 'seo_content' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Long-Form SEO Content</h2>
          <Field label="SEO Intro Heading" value={s(gsp.seo_intro_heading)} onSave={save('seo_intro_heading')} />
          <Field label="SEO Intro Body"    value={s(gsp.seo_intro_body)}    onSave={save('seo_intro_body')} multiline rows={6} />
          <Field label="SEO Conclusion"    value={s(gsp.seo_conclusion)}    onSave={save('seo_conclusion')} multiline rows={4} />
          <JsonArrayBuilder
            label="SEO Sections" itemNoun="section"
            fields={[{ key: 'heading', label: 'Heading' }, { key: 'body', label: 'Body', type: 'textarea' }]}
            value={gsp.seo_sections} onSave={saveJson('seo_sections')}
          />
        </div>
      )}
    </div>
  )
}

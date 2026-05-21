'use client'
// app/(admin)/city-service-pages/[id]/page.tsx
// COMPLETE CSP editor — all related tables:
// city_service_pages + csp_pricing_rows + csp_testimonials
// csp_faqs + csp_related_services + service_categories + seo_pages

import { useEffect, useState, useCallback } from 'react'
import { useParams }        from 'next/navigation'
import Link                 from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { Field }            from '@/components/ui/Field'
import { showToast }        from '@/components/ui/Toast'
import {
  saveCityServicePage,
  saveCspPricingRow,   addCspPricingRow,   deleteCspPricingRow,
  saveCspFaq,          addCspFaq,          deleteCspFaq,
  saveCspTestimonial,  addCspTestimonial,  deleteCspTestimonial,
} from '@/lib/actions'
import {
  ArrowLeft, Globe, Layers, Loader2, RefreshCw,
  ExternalLink, Plus, Trash2, Save,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Tabs — covers every table ──────────────────────────────────────────────────
const TABS = [
  { id: 'seo',         label: 'SEO'          },
  { id: 'hero',        label: 'Hero'         },
  { id: 'about',       label: 'About'        },
  { id: 'json',        label: 'JSON Fields'  },
  { id: 'pricing',     label: 'Pricing'      },
  { id: 'testimonials',label: 'Testimonials' },
  { id: 'faqs',        label: 'FAQs'         },
  { id: 'related',     label: 'Related'      },
  { id: 'seo_content', label: 'SEO Content'  },
  { id: 'category',    label: 'Category Info'},
] as const
type TabId = typeof TABS[number]['id']

type Row = Record<string, unknown>

export default function CspEditorPage() {
  const { id: cspId } = useParams() as { id: string }
  const sb = getBrowserClient()

  const [csp,      setCsp]      = useState<Row | null>(null)
  const [cat,      setCat]      = useState<Row | null>(null)
  const [seoPage,  setSeoPage]  = useState<Row | null>(null)
  const [pricing,  setPricing]  = useState<Row[]>([])
  const [tests,    setTests]    = useState<Row[]>([])
  const [faqs,     setFaqs]     = useState<Row[]>([])
  const [related,  setRelated]  = useState<Row[]>([])
  const [tab,      setTab]      = useState<TabId>('seo')
  const [loading,  setLoading]  = useState(true)

  // ── Fetch ALL ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await sb
      .from('city_service_pages')
      .select('*, service_categories(*), cities(name,phone,slug)')
      .eq('id', cspId)
      .single()
    if (!data) { setLoading(false); return }
    setCsp(data)
    setCat(data.service_categories as Row ?? null)

    const [p, t, f, r, sp] = await Promise.all([
      sb.from('csp_pricing_rows')   .select('*').eq('city_service_page_id', cspId).order('sort_order'),
      sb.from('csp_testimonials')   .select('*').eq('city_service_page_id', cspId).order('sort_order'),
      sb.from('csp_faqs')           .select('*').eq('city_service_page_id', cspId).order('sort_order'),
      sb.from('csp_related_services').select('*').eq('city_service_page_id', cspId).order('sort_order'),
      sb.from('seo_pages')          .select('url_path,page_type,is_active,is_indexed,updated_at')
        .eq('city_service_page_id', cspId).single(),
    ])

    setPricing(p.data ?? [])
    setTests  (t.data ?? [])
    setFaqs   (f.data ?? [])
    setRelated(r.data ?? [])
    setSeoPage(sp.data ?? null)
    setLoading(false)
  }, [cspId])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
    </div>
  )
  if (!csp) return <div className="text-red-400 p-8">CSP not found: {cspId}</div>

  const citySlug     = s(csp.city_slug)
  const categorySlug = s(csp.category_slug)
  const liveUrl      = `https://fiixup.in/${citySlug}/services/${categorySlug}`

  // ── Save helpers ───────────────────────────────────────────────────────────
  const save = (field: string) => async (val: string) => {
    const r = await saveCityServicePage(cspId, citySlug, categorySlug, { [field]: val })
    if (r.success) { setCsp(p => p ? { ...p, [field]: val } : p); showToast('success', r.message) }
    else showToast('error', r.error)
    return r
  }
  const saveNum = (field: string) => async (val: string) => {
    const n = parseFloat(val) || 0
    const r = await saveCityServicePage(cspId, citySlug, categorySlug, { [field]: n })
    if (r.success) { setCsp(p => p ? { ...p, [field]: n } : p); showToast('success', r.message) }
    else showToast('error', r.error)
    return r
  }
  const saveBool = async (field: string, val: boolean) => {
    const r = await saveCityServicePage(cspId, citySlug, categorySlug, { [field]: val })
    if (r.success) { setCsp(p => p ? { ...p, [field]: val } : p); showToast('success', r.message) }
    else showToast('error', r.error)
  }
  const saveJson = (field: string) => async (val: string) => {
    try {
      const parsed = JSON.parse(val)
      const r = await saveCityServicePage(cspId, citySlug, categorySlug, { [field]: parsed })
      if (r.success) { setCsp(p => p ? { ...p, [field]: parsed } : p); showToast('success', r.message) }
      else showToast('error', r.error)
      return r
    } catch { return { success: false as const, error: 'Invalid JSON' } }
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={`/cities/${citySlug}`}
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              {s(cat?.title ?? categorySlug)}
              <span className="text-[#6b7280] font-normal text-sm">in {s((csp.cities as Row)?.name ?? citySlug)}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full">
                /{citySlug}/services/{categorySlug}
              </span>
              <Toggle value={Boolean(csp.is_active)}    onChange={v => saveBool('is_active', v)}    label="Active"       />
              <Toggle value={Boolean(csp.ai_generated)} onChange={v => saveBool('ai_generated', v)} label="AI Generated" />
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
          { label: 'Pricing Rows',  count: pricing.length  },
          { label: 'Testimonials',  count: tests.length    },
          { label: 'FAQs',          count: faqs.length     },
          { label: 'Related Svcs',  count: related.length  },
        ].map(item => (
          <div key={item.label} className="admin-card px-3 py-2 text-center">
            <p className="text-lg font-bold text-[#e2e8f0]">{item.count}</p>
            <p className="text-xs text-[#6b7280]">{item.label}</p>
          </div>
        ))}
      </div>

      {/* ── SEO page status ── */}
      {seoPage && (
        <div className="admin-card px-4 py-3 flex items-center gap-4 flex-wrap text-xs">
          <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="font-mono text-[#6b7280]">{s(seoPage.url_path)}</span>
          <span className={clsx('px-2 py-0.5 rounded-full font-semibold',
            seoPage.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>
            {seoPage.is_active ? '✓ Active' : '✗ Inactive'}
          </span>
          <span className={clsx('px-2 py-0.5 rounded-full font-semibold',
            seoPage.is_indexed ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400')}>
            {seoPage.is_indexed ? '✓ Indexed' : '✗ No-index'}
          </span>
          <span className="text-[#6b7280]">
            Updated: {new Date(s(seoPage.updated_at)).toLocaleDateString('en-IN')}
          </span>
        </div>
      )}

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
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">SEO Meta</h2>
          <Field label="Meta Title"        value={s(csp.meta_title)}        onSave={save('meta_title')} />
          <Field label="Meta Description"  value={s(csp.meta_description)}  onSave={save('meta_description')} multiline rows={3} />
          <Field label="Meta Keywords"     value={s(csp.meta_keywords)}     onSave={save('meta_keywords')} multiline rows={2} />
          <Field label="Canonical URL"     value={s(csp.canonical_url)}     onSave={save('canonical_url')} />
          <Field label="OG Image URL"      value={s(csp.og_image_url)}      onSave={save('og_image_url')} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Schema Rating"       value={s(csp.schema_aggregate_rating)} numeric onSave={saveNum('schema_aggregate_rating')} />
            <Field label="Schema Review Count" value={s(csp.schema_review_count)}     numeric onSave={saveNum('schema_review_count')} />
          </div>
        </div>
      )}

      {/* ════════════ HERO ════════════ */}
      {tab === 'hero' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Hero Section</h2>
          <Field label="Hero Heading"    value={s(csp.hero_heading)}    onSave={save('hero_heading')} multiline rows={2} />
          <Field label="Hero Subheading" value={s(csp.hero_subheading)} onSave={save('hero_subheading')} multiline rows={3} />
          <Field label="Hero Badge Text" value={s(csp.hero_badge_text)} onSave={save('hero_badge_text')} />
        </div>
      )}

      {/* ════════════ ABOUT ════════════ */}
      {tab === 'about' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">About Section</h2>
          <Field label="About Heading"    value={s(csp.about_heading)} onSave={save('about_heading')} />
          <Field label="About Paragraph 1" value={s(csp.about_para1)} onSave={save('about_para1')} multiline rows={5} />
          <Field label="About Paragraph 2" value={s(csp.about_para2)} onSave={save('about_para2')} multiline rows={5} />
          <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
            <Field label="Pricing Intro"       value={s(csp.pricing_intro)}       onSave={save('pricing_intro')} multiline rows={2} />
            <Field label="Pricing Disclaimer"  value={s(csp.pricing_disclaimer)}  onSave={save('pricing_disclaimer')} multiline rows={2} />
          </div>
        </div>
      )}

      {/* ════════════ JSON FIELDS ════════════ */}
      {tab === 'json' && (
        <div className="space-y-4">
          <div className="admin-card p-4">
            <p className="text-xs text-[#6b7280] mb-4">
              These fields store structured data as JSON arrays. Edit carefully — invalid JSON will not save.
              Changes trigger the <code className="text-blue-400">trg_fn_csp_seo_page()</code> trigger automatically.
            </p>
          </div>
          {[
            { field: 'about_bullets',      label: 'About Bullets',         hint: '[{"heading":"...","text":"..."}]'              },
            { field: 'service_highlights', label: 'Service Highlights',    hint: '[{"title":"...","description":"..."}]'         },
            { field: 'why_choose_points',  label: 'Why Choose Points',     hint: '[{"icon":"Shield","title":"...","desc":"..."}]' },
            { field: 'process_steps',      label: 'Process Steps',         hint: '[{"step":1,"title":"...","desc":"..."}]'       },
          ].map(({ field, label, hint }) => (
            <div key={field} className="admin-card p-5">
              <JsonField
                label={`${label}`}
                hint={hint}
                value={csp[field]}
                onSave={saveJson(field)}
              />
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
                { key: 'label',      label: 'Label',          type: 'text',    required: true },
                { key: 'price_from', label: 'Price From (₹)', type: 'number',  required: true },
                { key: 'price_to',   label: 'Price To (₹)',   type: 'number'  },
                { key: 'note',       label: 'Note',           type: 'text'    },
                { key: 'highlight',  label: 'Highlight (true/false)', type: 'text' },
                { key: 'sort_order', label: 'Sort Order',     type: 'number'  },
              ]}
              onAdd={async data => {
                const r = await addCspPricingRow(cspId, citySlug, categorySlug, data)
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
                { key: 'label',      label: 'Label',          type: 'text'   },
                { key: 'price_from', label: 'Price From (₹)', type: 'number' },
                { key: 'price_to',   label: 'Price To (₹)',   type: 'number' },
                { key: 'note',       label: 'Note',           type: 'textarea'},
                { key: 'highlight',  label: 'Highlight',      type: 'boolean'},
                { key: 'sort_order', label: 'Sort Order',     type: 'number' },
              ]}
              onSave={async (rowId, data) => {
                const r = await saveCspPricingRow(rowId, cspId, citySlug, categorySlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
              onDelete={async rowId => {
                const r = await deleteCspPricingRow(rowId, cspId, citySlug, categorySlug)
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
        <div className="space-y-4">
          <SectionHeader title="Customer Testimonials" count={tests.length}>
            <AddRowBtn
              fields={[
                { key: 'name',       label: 'Customer Name', type: 'text',    required: true },
                { key: 'area',       label: 'Area',          type: 'text'    },
                { key: 'vehicle',    label: 'Vehicle',       type: 'text'    },
                { key: 'rating',     label: 'Rating (1-5)',  type: 'number',  required: true },
                { key: 'body',       label: 'Review Text',   type: 'textarea', required: true },
                { key: 'date_label', label: 'Date Label',    type: 'text'    },
                { key: 'sort_order', label: 'Sort Order',    type: 'number'  },
              ]}
              onAdd={async data => {
                const r = await addCspTestimonial(cspId, citySlug, categorySlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
            />
          </SectionHeader>
          {tests.length === 0 && <Empty>No testimonials yet.</Empty>}
          {tests.map(row => (
            <ChildRow key={s(row.id)} row={row}
              preview={`${s(row.name)} — ${s(row.rating)}★ — ${s(row.body).slice(0,60)}…`}
              fields={[
                { key: 'name',       label: 'Name',        type: 'text'    },
                { key: 'area',       label: 'Area',        type: 'text'    },
                { key: 'vehicle',    label: 'Vehicle',     type: 'text'    },
                { key: 'rating',     label: 'Rating',      type: 'number'  },
                { key: 'body',       label: 'Review',      type: 'textarea'},
                { key: 'date_label', label: 'Date Label',  type: 'text'    },
                { key: 'verified',   label: 'Verified',    type: 'boolean' },
                { key: 'sort_order', label: 'Sort Order',  type: 'number'  },
              ]}
              onSave={async (rowId, data) => {
                const r = await saveCspTestimonial(rowId, cspId, citySlug, categorySlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
              onDelete={async rowId => {
                const r = await deleteCspTestimonial(rowId, cspId, citySlug, categorySlug)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
            />
          ))}
        </div>
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
                const r = await addCspFaq(cspId, citySlug, categorySlug, data)
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
                { key: 'question',   label: 'Question',   type: 'textarea'},
                { key: 'answer',     label: 'Answer',     type: 'textarea'},
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onSave={async (rowId, data) => {
                const r = await saveCspFaq(rowId, cspId, citySlug, categorySlug, data)
                if (r.success) { fetchAll(); showToast('success', r.message) }
                else showToast('error', r.error)
                return r
              }}
              onDelete={async rowId => {
                const r = await deleteCspFaq(rowId, cspId, citySlug, categorySlug)
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
              table="csp_related_services"
              parentKey="city_service_page_id"
              parentId={cspId}
              fields={[
                { key: 'service_slug', label: 'Service Slug', type: 'text', required: true },
                { key: 'service_name', label: 'Service Name', type: 'text', required: true },
                { key: 'category',     label: 'Category',     type: 'text' },
                { key: 'sort_order',   label: 'Sort Order',   type: 'number' },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          <p className="text-xs text-[#6b7280] px-1">
            These appear as related service cards on /{citySlug}/services/{categorySlug}
          </p>
          {related.length === 0 && <Empty>No related services yet.</Empty>}
          {related.map(row => (
            <DirectChildRow key={s(row.id)} row={row} table="csp_related_services"
              preview={`${s(row.service_name)} → /${citySlug}/services/${s(row.service_slug)}`}
              fields={[
                { key: 'service_slug', label: 'Service Slug', type: 'text'   },
                { key: 'service_name', label: 'Service Name', type: 'text'   },
                { key: 'category',     label: 'Category',     type: 'text'   },
                { key: 'sort_order',   label: 'Sort Order',   type: 'number' },
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
          <Field label="SEO Intro Heading" value={s(csp.seo_intro_heading)} onSave={save('seo_intro_heading')} />
          <Field label="SEO Intro Body"    value={s(csp.seo_intro_body)}    onSave={save('seo_intro_body')} multiline rows={6} />
          <Field label="SEO Conclusion"    value={s(csp.seo_conclusion)}    onSave={save('seo_conclusion')} multiline rows={4} />
          <JsonField
            label="SEO Sections"
            hint='[{"heading":"...","body":"..."}]'
            value={csp.seo_sections}
            onSave={saveJson('seo_sections')}
          />
        </div>
      )}

      {/* ════════════ CATEGORY INFO ════════════ */}
      {tab === 'category' && (
        <div className="space-y-4">
          {cat ? (
            <div className="admin-card p-6 space-y-4">
              <h2 className="admin-section-title">Linked Service Category</h2>
              <p className="text-xs text-[#6b7280]">
                This CSP is linked to <code className="text-blue-400">service_categories.id = {s(csp.service_category_id)}</code>.
                Editing here updates the global category (affects all cities). For city-specific content use the other tabs.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Slug',        s(cat.slug)        ],
                  ['Title',       s(cat.title)       ],
                  ['Color',       s(cat.color)       ],
                  ['Icon',        s(cat.icon)        ],
                  ['Category Slug', s(cat.category_slug)],
                  ['Description', s(cat.description) ],
                ].map(([label, val]) => (
                  <div key={label} className="bg-[#0f1117] rounded-xl p-3">
                    <p className="text-xs text-[#6b7280] mb-1">{label}</p>
                    <p className="text-[#e2e8f0] text-sm font-medium truncate">{val || '—'}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#2a2d3e] pt-4">
                <p className="text-xs text-[#6b7280] mb-3">JSON fields on category (global):</p>
                {['benefits','pricing_summary','brands'].map(field => (
                  <div key={field} className="mb-4">
                    <label className="admin-label">{field}</label>
                    <pre className="bg-[#0f1117] rounded-lg p-3 text-xs text-[#6b7280] overflow-auto max-h-32">
                      {JSON.stringify(cat[field], null, 2) || '[]'}
                    </pre>
                  </div>
                ))}
                <Link
                  href={`/services`}
                  className="admin-btn-secondary inline-flex text-xs mt-2"
                >
                  Edit global service categories →
                </Link>
              </div>
            </div>
          ) : (
            <Empty>No category linked.</Empty>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6b7280] text-sm italic py-3 px-1">{children}</p>
}
function SectionHeader({ title, count, children }: {
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
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
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
function JsonField({ label, hint, value, onSave }: {
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
function ChildRow({ row, preview, fields, onSave, onDelete }: {
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
function AddRowBtn({ fields, onAdd }: {
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
function DirectAddBtn({ table, parentKey, parentId, fields, onAdded }: {
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
function DirectChildRow({ row, table, preview, fields, onSave }: {
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
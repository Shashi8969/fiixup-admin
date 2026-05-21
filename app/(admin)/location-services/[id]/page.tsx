'use client'
// app/(admin)/location-services/[id]/page.tsx
// COMPLETE Location Service editor — ALL related tables:
// location_services + ls_pricing_rows + ls_testimonials + ls_faqs
// ls_nearby_areas + ls_related_services + service_images
// review_sources + seo_pages + page_analytics

import { useEffect, useState, useCallback } from 'react'
import { useParams }        from 'next/navigation'
import Link                 from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { Field }            from '@/components/ui/Field'
import { showToast }        from '@/components/ui/Toast'
import {
  ArrowLeft, ExternalLink, RefreshCw, Loader2,
  Plus, Trash2, Save, ChevronDown, ChevronRight,
  Star, Globe, BarChart2, Image as ImageIcon,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'seo',         label: 'SEO'         },
  { id: 'hero',        label: 'Hero'        },
  { id: 'about',       label: 'About'       },
  { id: 'pricing',     label: 'Pricing'     },
  { id: 'testimonials',label: 'Testimonials'},
  { id: 'faqs',        label: 'FAQs'        },
  { id: 'nearby',      label: 'Nearby Areas'},
  { id: 'related',     label: 'Related'     },
  { id: 'images',      label: 'Images'      },
  { id: 'reviews',     label: 'Reviews'     },
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
  const [reviews,  setReviews]  = useState<Row[]>([])
  const [seoPage,  setSeoPage]  = useState<Row | null>(null)
  const [analytics,setAnalytics]= useState<Row | null>(null)

  // ── Fetch ALL ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: lsData } = await sb
      .from('location_services').select('*').eq('id', id).single()
    if (!lsData) { setLoading(false); return }
    setLs(lsData)

    const [p, t, f, n, r, img, rev, sp] = await Promise.all([
      sb.from('ls_pricing_rows')    .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_testimonials')    .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_faqs')            .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_nearby_areas')    .select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('ls_related_services').select('*').eq('location_service_id', id).order('sort_order'),
      sb.from('service_images')     .select('*').eq('ls_id', id).order('sort_order'),
      sb.from('review_sources')     .select('*').eq('ls_id', id).order('created_at', { ascending: false }),
      sb.from('seo_pages')          .select('*').eq('location_service_id', id).single(),
    ])

    setPricing (p.data   ?? [])
    setTests   (t.data   ?? [])
    setFaqs    (f.data   ?? [])
    setNearby  (n.data   ?? [])
    setRelated (r.data   ?? [])
    setImages  (img.data ?? [])
    setReviews (rev.data ?? [])
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
  const saveLS = (col: string) => async (val: string) => {
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

  const saveLSBool = async (col: string, val: boolean) => {
    const { error } = await sb.from('location_services')
      .update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return }
    setLs(p => p ? { ...p, [col]: val } : p)
    showToast('success', 'Saved')
  }

  const liveUrl = ls.canonical_url
    ? `https://fiixup.in${String(ls.canonical_url).startsWith('/') ? '' : '/'}${ls.canonical_url}`
    : `https://fiixup.in/${ls.city_slug}/${ls.service_slug}`

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/location-services"
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Pricing',     count: pricing.length,  color: 'blue'   },
          { label: 'Testimonials',count: tests.length,    color: 'yellow' },
          { label: 'FAQs',        count: faqs.length,     color: 'green'  },
          { label: 'Nearby',      count: nearby.length,   color: 'purple' },
          { label: 'Related',     count: related.length,  color: 'orange' },
          { label: 'Images',      count: images.length,   color: 'pink'   },
          { label: 'Reviews',     count: reviews.length,  color: 'red'    },
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
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">SEO Meta</h2>
          <Field label="Meta Title"        value={s(ls.meta_title)}        onSave={saveLS('meta_title')} />
          <Field label="Meta Description"  value={s(ls.meta_description)}  onSave={saveLS('meta_description')} multiline rows={3} />
          <Field label="Meta Keywords"     value={s(ls.meta_keywords)}     onSave={saveLS('meta_keywords')} multiline rows={2} />
          <Field label="Canonical URL"     value={s(ls.canonical_url)}     onSave={saveLS('canonical_url')} />
          <Field label="OG Image URL"      value={s(ls.og_image_url)}      onSave={saveLS('og_image_url')} />
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
        </div>
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

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      {tab === 'testimonials' && (
        <div className="space-y-4">
          <SectionHeader title="Testimonials" count={tests.length}>
            <AddBtn table="ls_testimonials" parentKey="location_service_id" parentId={id}
              fields={[
                { key: 'name',       label: 'Customer Name', type: 'text',    required: true },
                { key: 'area',       label: 'Area',          type: 'text'    },
                { key: 'vehicle',    label: 'Vehicle',       type: 'text'    },
                { key: 'rating',     label: 'Rating (1-5)',  type: 'number',  required: true },
                { key: 'body',       label: 'Review Text',   type: 'textarea', required: true },
                { key: 'date_label', label: 'Date Label',    type: 'text'    },
                { key: 'source',     label: 'Source',        type: 'text'    },
                { key: 'sort_order', label: 'Sort Order',    type: 'number'  },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {tests.length === 0 && <Empty>No testimonials yet.</Empty>}
          {tests.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_testimonials"
              preview={`${s(row.name)} — ${s(row.rating)}★ — ${s(row.body).slice(0, 60)}…`}
              fields={[
                { key: 'name',       label: 'Name',        type: 'text'    },
                { key: 'area',       label: 'Area',        type: 'text'    },
                { key: 'vehicle',    label: 'Vehicle',     type: 'text'    },
                { key: 'rating',     label: 'Rating',      type: 'number'  },
                { key: 'body',       label: 'Review',      type: 'textarea'},
                { key: 'date_label', label: 'Date Label',  type: 'text'    },
                { key: 'source',     label: 'Source',      type: 'text'    },
                { key: 'verified',   label: 'Verified',    type: 'boolean' },
                { key: 'sort_order', label: 'Sort Order',  type: 'number'  },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ══════════════ FAQs ══════════════ */}
      {tab === 'faqs' && (
        <div className="space-y-4">
          <SectionHeader title="FAQs" count={faqs.length}>
            <AddBtn table="ls_faqs" parentKey="location_service_id" parentId={id}
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea', required: true },
                { key: 'answer',     label: 'Answer',     type: 'textarea', required: true },
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {faqs.length === 0 && <Empty>No FAQs yet.</Empty>}
          {faqs.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_faqs"
              preview={s(row.question).slice(0, 80)}
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea'},
                { key: 'answer',     label: 'Answer',     type: 'textarea'},
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ══════════════ NEARBY AREAS ══════════════ */}
      {tab === 'nearby' && (
        <div className="space-y-4">
          <SectionHeader title="Nearby Areas" count={nearby.length}>
            <AddBtn table="ls_nearby_areas" parentKey="location_service_id" parentId={id}
              fields={[
                { key: 'name',       label: 'Area Name', type: 'text', required: true },
                { key: 'slug',       label: 'Area Slug', type: 'text', required: true },
                { key: 'sort_order', label: 'Sort Order',type: 'number' },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          <p className="text-xs text-[#6b7280]">
            These appear as internal links on the service page — each linking to /{s(ls.city_slug)}/[area-slug]
          </p>
          {nearby.length === 0 && <Empty>No nearby areas yet.</Empty>}
          {nearby.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_nearby_areas"
              preview={`${s(row.name)} → /${s(ls.city_slug)}/${s(row.slug)}`}
              fields={[
                { key: 'name',       label: 'Area Name', type: 'text'   },
                { key: 'slug',       label: 'Area Slug', type: 'text'   },
                { key: 'sort_order', label: 'Sort Order',type: 'number' },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ══════════════ RELATED SERVICES ══════════════ */}
      {tab === 'related' && (
        <div className="space-y-4">
          <SectionHeader title="Related Services" count={related.length}>
            <AddBtn table="ls_related_services" parentKey="location_service_id" parentId={id}
              fields={[
                { key: 'name',       label: 'Service Name', type: 'text', required: true },
                { key: 'slug',       label: 'Service Slug', type: 'text', required: true },
                { key: 'category',   label: 'Category',     type: 'text' },
                { key: 'sort_order', label: 'Sort Order',   type: 'number' },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {related.length === 0 && <Empty>No related services yet.</Empty>}
          {related.map(row => (
            <ChildRow key={s(row.id)} row={row} table="ls_related_services"
              preview={`${s(row.name)} → /${s(ls.city_slug)}/${s(row.slug)}`}
              fields={[
                { key: 'name',       label: 'Service Name', type: 'text'   },
                { key: 'slug',       label: 'Service Slug', type: 'text'   },
                { key: 'category',   label: 'Category',     type: 'text'   },
                { key: 'sort_order', label: 'Sort Order',   type: 'number' },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ══════════════ IMAGES ══════════════ */}
      {tab === 'images' && (
        <div className="space-y-4">
          <SectionHeader title="Service Images" count={images.length}>
            <AddBtn table="service_images" parentKey="ls_id" parentId={id}
              fields={[
                { key: 'url',        label: 'Image URL',  type: 'text', required: true },
                { key: 'alt_text',   label: 'Alt Text',   type: 'text', required: true },
                { key: 'caption',    label: 'Caption',    type: 'text' },
                { key: 'is_hero',    label: 'Hero Image (true/false)', type: 'text' },
                { key: 'sort_order', label: 'Sort Order', type: 'number' },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {images.length === 0 && <Empty>No images yet.</Empty>}
          {images.map(row => (
            <div key={s(row.id)} className="admin-card p-4 flex items-start gap-4">
              {s(row.url) && (
                <img src={s(row.url)} alt={s(row.alt_text)}
                  className="w-24 h-16 object-cover rounded-lg flex-shrink-0 bg-[#2a2d3e]"
                  onError={e => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-[#e2e8f0] truncate">{s(row.alt_text)}</p>
                <p className="text-xs text-[#6b7280] truncate">{s(row.url)}</p>
                {Boolean(row.is_hero) && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Hero</span>}
              </div>
              <DelBtn table="service_images" id={s(row.id)} onDeleted={fetchAll} />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════ REVIEWS ══════════════ */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          <SectionHeader title="Review Sources" count={reviews.length}>
            <AddBtn table="review_sources" parentKey="ls_id" parentId={id}
              fields={[
                { key: 'author_name', label: 'Author Name',  type: 'text',    required: true },
                { key: 'rating',      label: 'Rating (1-5)', type: 'number',  required: true },
                { key: 'body',        label: 'Review Text',  type: 'textarea', required: true },
                { key: 'vehicle',     label: 'Vehicle',      type: 'text'    },
                { key: 'location',    label: 'Location',     type: 'text'    },
                { key: 'source',      label: 'Source (manual/google/justdial)', type: 'text' },
                { key: 'external_id', label: 'External ID',  type: 'text'    },
              ]}
              onAdded={fetchAll}
            />
          </SectionHeader>
          {reviews.length === 0 && <Empty>No review sources yet.</Empty>}
          {reviews.map(row => (
            <ChildRow key={s(row.id)} row={row} table="review_sources"
              preview={`${s(row.author_name)} — ${s(row.rating)}★ [${s(row.source)}] — ${s(row.body).slice(0,60)}…`}
              fields={[
                { key: 'author_name', label: 'Author Name', type: 'text'    },
                { key: 'rating',      label: 'Rating',      type: 'number'  },
                { key: 'body',        label: 'Review',      type: 'textarea'},
                { key: 'vehicle',     label: 'Vehicle',     type: 'text'    },
                { key: 'location',    label: 'Location',    type: 'text'    },
                { key: 'source',      label: 'Source',      type: 'text'    },
                { key: 'verified',    label: 'Verified',    type: 'boolean' },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
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

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-[#6b7280]">{label}</span>}
      <button onClick={() => onChange(!value)}
        className={clsx('relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          value ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
        <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      <span className={clsx('text-xs font-semibold', value ? 'text-green-400' : 'text-red-400')}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  )
}

// ── Delete button ──────────────────────────────────────────────────────────────
function DelBtn({ table, id, onDeleted }: { table: string; id: string; onDeleted: () => void }) {
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
function ChildRow({ row, table, preview, fields, onSave }: {
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
function AddBtn({ table, parentKey, parentId, fields, onAdded }: {
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
function JsonField({ label, value, onSave }: {
  label: string; value: unknown
  onSave: (v: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [text, setText] = useState(JSON.stringify(value ?? [], null, 2))
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    try { JSON.parse(text); setErr('') }
    catch { setErr('Invalid JSON — fix before saving'); return }
    setBusy(true)
    const r = await onSave(text)
    setBusy(false)
    if (!r.success) setErr(r.error ?? 'Error')
  }

  return (
    <div className="space-y-1.5">
      <label className="admin-label">{label}</label>
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={6} className="admin-textarea font-mono text-xs" spellCheck={false} />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button onClick={save} disabled={busy} className="admin-btn-primary">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save JSON
      </button>
    </div>
  )
}
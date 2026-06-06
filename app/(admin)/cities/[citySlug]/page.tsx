'use client'
// app/(admin)/cities/[citySlug]/page.tsx
// COMPLETE city editor — all related tables:
// cities + areas + city_faqs + city_testimonials + 
// city_service_highlights + city_service_pages (+ csp children)

import { useEffect, useState, useCallback } from 'react'
import { useParams }     from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { Field }         from '@/components/ui/Field'
import { SeoMetaPanel }  from '@/components/seo/SeoMetaPanel'
import { SchemaMultiSelector } from '@/components/schema/SchemaMultiSelector'
import { AdminBackButton } from '@/components/navigation/AdminBackButton'
import { LivePagePreview } from '@/components/preview/LivePagePreview'
import { publicSiteUrl } from '@/lib/public-site'
import type { SchemaEntityType } from '@/utils/schema/schemaTypes'
import { showToast }     from '@/components/ui/Toast'
import {
  MapPin, ArrowLeft, Globe, ExternalLink,
  RefreshCw, Loader2, Plus, Trash2,
  ChevronDown, ChevronRight, Save,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  AddAreaButton,
  AddRowButton,
  AreaRow,
  Badge,
  CSPCard,
  EditableRow,
  Empty,
  JsonField,
  SectionTitle,
  s,
} from '@/components/cities/editor/CityEditorParts'

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'seo',         label: 'SEO'         },
  { id: 'preview',     label: 'Preview'     },
  { id: 'hero',        label: 'Hero'        },
  { id: 'schema',      label: 'Schema'      },
  { id: 'about',       label: 'About'       },
  { id: 'stats',       label: 'Stats'       },
  { id: 'areas',       label: 'Areas'       },
  { id: 'highlights',  label: 'Highlights'  },
  { id: 'testimonials',label: 'Testimonials'},
  { id: 'faqs',        label: 'FAQs'        },
  { id: 'csp',         label: 'Service Pages'},
  { id: 'contact',     label: 'Contact'     },
] as const
type TabId = typeof TABS[number]['id']

// ── Types ──────────────────────────────────────────────────────────────────────
type City        = Record<string, unknown>
type Area        = Record<string, unknown>
type Highlight   = Record<string, unknown>
type Testimonial = Record<string, unknown>
type Faq         = Record<string, unknown>
type CSP         = Record<string, unknown>

export default function CityEditorPage() {
  const { citySlug } = useParams() as { citySlug: string }
  const sb = getBrowserClient()

  // ── State ──────────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState<TabId>('seo')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)

  const [city,         setCity]         = useState<City | null>(null)
  const [areas,        setAreas]        = useState<Area[]>([])
  const [highlights,   setHighlights]   = useState<Highlight[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [faqs,         setFaqs]         = useState<Faq[]>([])
  const [csps,         setCsps]         = useState<CSP[]>([])

  // ── Fetch ALL related data ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: cityData } = await sb
      .from('cities').select('*').eq('slug', citySlug).single()
    if (!cityData) { setLoading(false); return }
    setCity(cityData)
    const cid = cityData.id as string

    const [a, h, t, f, c] = await Promise.all([
      sb.from('areas').select('*').eq('city_id', cid).order('sort_order'),
      sb.from('city_service_highlights').select('*').eq('city_id', cid).order('sort_order'),
      sb.from('city_testimonials').select('*').eq('city_id', cid).order('sort_order'),
      sb.from('city_faqs').select('*').eq('city_id', cid).order('sort_order'),
      sb.from('city_service_pages')
        .select('*, service_categories(slug,title,color,icon)')
        .eq('city_id', cid)
        .order('category_slug'),
    ])

    setAreas       (a.data ?? [])
    setHighlights  (h.data ?? [])
    setTestimonials(t.data ?? [])
    setFaqs        (f.data ?? [])
    setCsps        (c.data ?? [])
    setLoading(false)
  }, [citySlug])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!city) return (
    <div className="text-red-400 p-8">City not found: {citySlug}</div>
  )

  // ── Save a single city column ──────────────────────────────────────────────
  const saveCity = async (col: string, val: unknown) => {
    setSaving(true)
    const { error } = await sb.from('cities').update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', city.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setCity(p => p ? { ...p, [col]: val } : p)
    showToast('success', `${col} saved — seo_pages rebuilding automatically`)
    return { success: true, message: `${col} saved` }
  }

  const saveField = (col: string) => async (val: string) => saveCity(col, val)
  const saveNum   = (col: string) => async (val: string) => saveCity(col, parseFloat(val) || 0)
  const saveJson  = (col: string) => async (val: string) => {
    try { return await saveCity(col, JSON.parse(val)) }
    catch { showToast('error', 'Invalid JSON'); return { success: false, error: 'Invalid JSON' } }
  }

  const saveCityPatch = async (patch: Record<string, unknown>) => {
    setSaving(true)
    const { error } = await sb
      .from('cities')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', city.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setCity(p => p ? { ...p, ...patch } : p)
    return { success: true, message: 'Schema saved' }
  }

  const liveUrl = publicSiteUrl(`/${citySlug}`)

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBackButton fallbackHref="/cities" className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </AdminBackButton>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              {String(city.name)} <span className="text-[#6b7280] font-normal text-sm">/ {citySlug}</span>
            </h1>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {String(city.state ?? '')} · {areas.length} areas · {csps.length} service pages · {testimonials.length} reviews · {faqs.length} FAQs
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchAll} className="admin-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
            <ExternalLink className="w-4 h-4" /> View Live
          </a>
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
              tab === t.id ? 'tab-active' : 'tab-inactive'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════ SEO ════════════════════ */}
      {tab === 'seo' && (
        <SeoMetaPanel
          title={s(city.meta_title)}
          description={s(city.meta_description)}
          keywords={s(city.meta_keywords)}
          urlPath={`/${citySlug}`}
          onSaveTitle={saveField('meta_title')}
          onSaveDescription={saveField('meta_description')}
          onSaveKeywords={saveField('meta_keywords')}
          extraFields={
            <>
              <Field label="OG Image URL" value={s(city.og_image_url)} onSave={saveField('og_image_url')} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Schema Rating"       value={s(city.schema_aggregate_rating)} numeric onSave={saveNum('schema_aggregate_rating')} />
                <Field label="Schema Review Count" value={s(city.schema_review_count)}     numeric onSave={saveNum('schema_review_count')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude"  value={s(city.latitude)}  numeric onSave={saveNum('latitude')} />
                <Field label="Longitude" value={s(city.longitude)} numeric onSave={saveNum('longitude')} />
              </div>
              <Field label="Postal Code" value={s(city.postal_code)} onSave={saveField('postal_code')} />
            </>
          }
        />
      )}

      {/* ════════════════════ PREVIEW ════════════════════ */}
      {tab === 'preview' && (
        <LivePagePreview
          title={`City preview — ${s(city.name) || citySlug}`}
          url={liveUrl}
          description="Loads the real Fiixup city frontend page inside admin. Save city/area changes first, then reload preview to verify the live design."
        />
      )}

      {/* ════════════════════ PREVIEW ════════════════════ */}
      {tab === 'preview' && (
        <LivePagePreview
          title={`City preview — ${s(city.name) || citySlug}`}
          url={liveUrl}
          description="Loads the real Fiixup city frontend page inside admin. Save city/area changes first, then reload preview to verify the live design."
        />
      )}

      {/* ════════════════════ SCHEMA ════════════════════ */}
      {tab === 'schema' && (
        <SchemaMultiSelector
          kind="city"
          record={city}
          urlPath={`/${citySlug}`}
          faqs={faqs}
          selectedTypes={(Array.isArray(city.schema_types) ? city.schema_types : undefined) as SchemaEntityType[] | undefined}
          overrides={(city.schema_overrides && typeof city.schema_overrides === 'object' ? city.schema_overrides : {}) as Record<string, unknown>}
          onSave={saveCityPatch}
        />
      )}

      {/* ════════════════════ HERO ════════════════════ */}
      {tab === 'hero' && (
        <div className="admin-card p-6 space-y-4">
          <SectionTitle>Hero Section</SectionTitle>
          <Field label="Hero Tagline"    value={s(city.hero_tagline)}   onSave={saveField('hero_tagline')} />
          <Field label="Hero Heading"    value={s(city.hero_heading)}   onSave={saveField('hero_heading')} multiline rows={2} />
          <Field label="Hero Image URL"  value={s(city.hero_image_url)} onSave={saveField('hero_image_url')} />
          <Field label="Hero Image Alt"  value={s(city.hero_image_alt)} onSave={saveField('hero_image_alt')} />
          <JsonField label="Hero Bullets (JSON array of strings)" value={city.hero_bullets} onSave={saveJson('hero_bullets')} />
          <JsonField label="Hero Stats (JSON array [{value,label}])" value={city.hero_stats} onSave={saveJson('hero_stats')} />
          <JsonField label="Trust Points (JSON array of strings)"   value={city.trust_points} onSave={saveJson('trust_points')} />
        </div>
      )}

      {/* ════════════════════ ABOUT ════════════════════ */}
      {tab === 'about' && (
        <div className="admin-card p-6 space-y-4">
          <SectionTitle>About Section</SectionTitle>
          <Field label="About Heading"   value={s(city.about_heading)}   onSave={saveField('about_heading')} />
          <Field label="About Paragraph 1" value={s(city.about_para1)}  onSave={saveField('about_para1')} multiline rows={5} />
          <Field label="About Paragraph 2" value={s(city.about_para2)}  onSave={saveField('about_para2')} multiline rows={5} />
          <Field label="About Image URL" value={s(city.about_image_url)} onSave={saveField('about_image_url')} />
          <Field label="About Image Alt" value={s(city.about_image_alt)} onSave={saveField('about_image_alt')} />
          <JsonField label="About Bullets (JSON)" value={city.about_bullets} onSave={saveJson('about_bullets')} />
          <Field label="Services Section Heading"  value={s(city.services_section_heading)}  onSave={saveField('services_section_heading')} />
          <Field label="Services Section Subtext"  value={s(city.services_section_subtext)}  onSave={saveField('services_section_subtext')} multiline rows={2} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Car Services Heading"  value={s(city.car_services_heading)}  onSave={saveField('car_services_heading')} />
            <Field label="Bike Services Heading" value={s(city.bike_services_heading)} onSave={saveField('bike_services_heading')} />
          </div>
        </div>
      )}

      {/* ════════════════════ STATS ════════════════════ */}
      {tab === 'stats' && (
        <div className="admin-card p-6 space-y-4">
          <SectionTitle>Stats & Numbers</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stats Customers (e.g. 5,000+)" value={s(city.stats_customers)}    onSave={saveField('stats_customers')} />
            <Field label="Stats Satisfaction (e.g. 98%)" value={s(city.stats_satisfaction)} onSave={saveField('stats_satisfaction')} />
          </div>
          <Field label="Stats Coverage (e.g. 50+ Areas)" value={s(city.stats_coverage)} onSave={saveField('stats_coverage')} />
          <Field label="Stats Label"                      value={s(city.stats_label)}    onSave={saveField('stats_label')} />
          <Field label="Testimonials Heading" value={s(city.testimonials_heading)} onSave={saveField('testimonials_heading')} />
          <Field label="Testimonials Subtext" value={s(city.testimonials_subtext)} onSave={saveField('testimonials_subtext')} multiline rows={2} />
        </div>
      )}

      {/* ════════════════════ AREAS ════════════════════ */}
      {tab === 'areas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle>Areas <Badge>{areas.length}</Badge></SectionTitle>
            <AddAreaButton cityId={String(city.id)} citySlug={citySlug} onAdded={fetchAll} />
          </div>
          {areas.length === 0 && <Empty>No areas yet.</Empty>}
          {areas.map(area => (
            <AreaRow key={String(area.id)} area={area} onSave={fetchAll} />
          ))}
        </div>
      )}

      {/* ════════════════════ HIGHLIGHTS ════════════════════ */}
      {tab === 'highlights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle>Service Highlights <Badge>{highlights.length}</Badge></SectionTitle>
            <AddRowButton table="city_service_highlights" parentKey="city_id" parentId={String(city.id)}
              fields={[
                { key: 'title',       label: 'Title',       type: 'text'    },
                { key: 'description', label: 'Description', type: 'textarea'},
                { key: 'sort_order',  label: 'Sort Order',  type: 'number'  },
              ]}
              onAdded={fetchAll}
            />
          </div>
          {highlights.length === 0 && <Empty>No highlights yet.</Empty>}
          {highlights.map(h => (
            <EditableRow key={String(h.id)} row={h} table="city_service_highlights"
              fields={[
                { key: 'title',       label: 'Title',       type: 'text'     },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'sort_order',  label: 'Sort Order',  type: 'number'   },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ════════════════════ TESTIMONIALS ════════════════════ */}
      {tab === 'testimonials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle>Customer Testimonials <Badge>{testimonials.length}</Badge></SectionTitle>
            <AddRowButton table="city_testimonials" parentKey="city_id" parentId={String(city.id)}
              fields={[
                { key: 'name',       label: 'Customer Name', type: 'text'    },
                { key: 'area',       label: 'Area',          type: 'text'    },
                { key: 'vehicle',    label: 'Vehicle',       type: 'text'    },
                { key: 'rating',     label: 'Rating (1-5)',  type: 'number'  },
                { key: 'body',       label: 'Review Text',   type: 'textarea'},
                { key: 'date_label', label: 'Date Label',    type: 'text'    },
                { key: 'sort_order', label: 'Sort Order',    type: 'number'  },
              ]}
              onAdded={fetchAll}
            />
          </div>
          {testimonials.length === 0 && <Empty>No testimonials yet.</Empty>}
          {testimonials.map(t => (
            <EditableRow key={String(t.id)} row={t} table="city_testimonials"
              fields={[
                { key: 'name',       label: 'Name',         type: 'text'    },
                { key: 'area',       label: 'Area',         type: 'text'    },
                { key: 'vehicle',    label: 'Vehicle',      type: 'text'    },
                { key: 'rating',     label: 'Rating',       type: 'number'  },
                { key: 'body',       label: 'Review',       type: 'textarea'},
                { key: 'date_label', label: 'Date Label',   type: 'text'    },
                { key: 'sort_order', label: 'Sort Order',   type: 'number'  },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ════════════════════ FAQs ════════════════════ */}
      {tab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle>City FAQs <Badge>{faqs.length}</Badge></SectionTitle>
            <AddRowButton table="city_faqs" parentKey="city_id" parentId={String(city.id)}
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea'},
                { key: 'answer',     label: 'Answer',     type: 'textarea'},
                { key: 'category',   label: 'Category',   type: 'text'    },
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onAdded={fetchAll}
            />
          </div>
          {faqs.length === 0 && <Empty>No FAQs yet.</Empty>}
          {faqs.map(f => (
            <EditableRow key={String(f.id)} row={f} table="city_faqs"
              fields={[
                { key: 'question',   label: 'Question',   type: 'textarea'},
                { key: 'answer',     label: 'Answer',     type: 'textarea'},
                { key: 'category',   label: 'Category',   type: 'text'    },
                { key: 'sort_order', label: 'Sort Order', type: 'number'  },
              ]}
              onSave={fetchAll}
            />
          ))}
        </div>
      )}

      {/* ════════════════════ SERVICE PAGES (CSP) ════════════════════ */}
      {tab === 'csp' && (
        <div className="space-y-4">
          <SectionTitle>
            City Service Pages <Badge>{csps.length}</Badge>
            <span className="text-xs text-[#6b7280] font-normal ml-2">
              /{citySlug}/services/[category] — editing each opens its own editor
            </span>
          </SectionTitle>
          {csps.length === 0 && <Empty>No service pages found.</Empty>}
          {csps.map(csp => (
            <CSPCard key={String(csp.id)} csp={csp} citySlug={citySlug} onSave={fetchAll} />
          ))}
        </div>
      )}

      {/* ════════════════════ CONTACT ════════════════════ */}
      {tab === 'contact' && (
        <div className="admin-card p-6 space-y-4">
          <SectionTitle>Contact & Location</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"     value={s(city.phone)}    onSave={saveField('phone')} />
            <Field label="WhatsApp"  value={s(city.whatsapp)} onSave={saveField('whatsapp')} />
          </div>
          <Field label="Email"         value={s(city.email)}          onSave={saveField('email')} />
          <Field label="Address Line 1" value={s(city.address_line1)} onSave={saveField('address_line1')} />
          <Field label="Address Line 2" value={s(city.address_line2)} onSave={saveField('address_line2')} />
          <Field label="Map Embed URL"  value={s(city.map_embed_url)} onSave={saveField('map_embed_url')} multiline rows={3} />
          <JsonField
            label="Related Post Slugs (JSON array of strings)"
            value={city.related_post_slugs}
            onSave={saveJson('related_post_slugs')}
          />
        </div>
      )}
    </div>
  )
}

// ── Helper: string coercion ────────────────────────────────────────────────────

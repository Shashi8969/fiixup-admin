'use client'
// app/(admin)/cities/[citySlug]/page.tsx
// COMPLETE city editor — all related tables:
// cities + areas + city_faqs + city_testimonials + 
// city_service_highlights + city_service_pages (+ csp children)

import { useEffect, useState, useCallback } from 'react'
import { useParams }     from 'next/navigation'
import Link              from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { Field }         from '@/components/ui/Field'
import { showToast }     from '@/components/ui/Toast'
import {
  MapPin, ArrowLeft, Globe, ExternalLink,
  RefreshCw, Loader2, Plus, Trash2,
  ChevronDown, ChevronRight, Save,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'seo',         label: 'SEO'         },
  { id: 'hero',        label: 'Hero'        },
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

  const liveUrl = `https://fiixup.in/${citySlug}`

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/cities" className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
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
        <div className="admin-card p-6 space-y-4">
          <SectionTitle>SEO Meta</SectionTitle>
          <Field label="Meta Title"        value={s(city.meta_title)}        onSave={saveField('meta_title')} />
          <Field label="Meta Description"  value={s(city.meta_description)}  onSave={saveField('meta_description')} multiline rows={3} />
          <Field label="Meta Keywords"     value={s(city.meta_keywords)}     onSave={saveField('meta_keywords')} multiline rows={2} />
          <Field label="OG Image URL"      value={s(city.og_image_url)}      onSave={saveField('og_image_url')} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Schema Rating"       value={s(city.schema_aggregate_rating)} numeric onSave={saveNum('schema_aggregate_rating')} />
            <Field label="Schema Review Count" value={s(city.schema_review_count)}     numeric onSave={saveNum('schema_review_count')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitude"   value={s(city.latitude)}   numeric onSave={saveNum('latitude')} />
            <Field label="Longitude"  value={s(city.longitude)}  numeric onSave={saveNum('longitude')} />
          </div>
          <Field label="Postal Code"  value={s(city.postal_code)} onSave={saveField('postal_code')} />
        </div>
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
function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

// ── Small UI helpers ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="admin-section-title mb-1">{children}</h2>
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="ml-1.5 text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full font-normal">{children}</span>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[#6b7280] text-sm italic py-3">{children}</p>
}

// ── JSON textarea editor ───────────────────────────────────────────────────────
function JsonField({ label, value, onSave }: {
  label: string
  value: unknown
  onSave: (v: string) => Promise<{ success: boolean; error?: string }>
}) {
  const [text, setText]   = useState(JSON.stringify(value ?? [], null, 2))
  const [err,  setErr]    = useState('')
  const [busy, setBusy]   = useState(false)

  const handleSave = async () => {
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
      <textarea value={text} onChange={e => setText(e.target.value)}
        rows={6} className="admin-textarea font-mono text-xs" spellCheck={false} />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button onClick={handleSave} disabled={busy} className="admin-btn-primary">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save JSON
      </button>
    </div>
  )
}

// ── Area row (inline edit) ────────────────────────────────────────────────────
function AreaRow({ area, onSave }: { area: Area; onSave: () => void }) {
  const sb = getBrowserClient()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState({
    name:       String(area.name ?? ''),
    slug:       String(area.slug ?? ''),
    highlight:  String(area.highlight ?? ''),
    sort_order: String(area.sort_order ?? '0'),
    latitude:   String(area.latitude ?? ''),
    longitude:  String(area.longitude ?? ''),
    is_active:  Boolean(area.is_active ?? true),
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await sb.from('areas').update({
      name:      form.name,
      slug:      form.slug,
      highlight: form.highlight,
      sort_order:parseInt(form.sort_order) || 0,
      latitude:  form.latitude  ? parseFloat(form.latitude)  : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', area.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', `Area "${form.name}" saved`)
    onSave()
    setExpanded(false)
  }

  const del = async () => {
    if (!confirm(`Delete area "${form.name}"?`)) return
    const { error } = await sb.from('areas').delete().eq('id', area.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Area deleted')
    onSave()
  }

  return (
    <div className="admin-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-[#6b7280] flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#6b7280] flex-shrink-0" />}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="font-semibold text-[#e2e8f0] text-sm">{form.name}</span>
          <span className="text-xs text-[#6b7280]">/{form.slug}</span>
          {!form.is_active && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
        </div>
        <span className="text-xs text-[#6b7280] flex-shrink-0">Sort: {form.sort_order}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Name"  value={form.name}  onChange={v => setForm(p=>({...p,name:v}))} />
            <Inp label="Slug"  value={form.slug}  onChange={v => setForm(p=>({...p,slug:v}))} />
          </div>
          <Inp label="Highlight text" value={form.highlight} onChange={v => setForm(p=>({...p,highlight:v}))} />
          <div className="grid grid-cols-3 gap-3">
            <Inp label="Sort Order" value={form.sort_order} onChange={v => setForm(p=>({...p,sort_order:v}))} />
            <Inp label="Latitude"   value={form.latitude}   onChange={v => setForm(p=>({...p,latitude:v}))} />
            <Inp label="Longitude"  value={form.longitude}  onChange={v => setForm(p=>({...p,longitude:v}))} />
          </div>
          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="admin-label mb-0">Active</label>
            <button onClick={() => setForm(p=>({...p,is_active:!p.is_active}))}
              className={clsx('relative w-10 h-5 rounded-full transition-colors',
                form.is_active ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
              <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                form.is_active ? 'translate-x-5' : 'translate-x-0.5')} />
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Area
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

// ── Add Area button ────────────────────────────────────────────────────────────
function AddAreaButton({ cityId, citySlug, onAdded }: { cityId: string; citySlug: string; onAdded: () => void }) {
  const sb = getBrowserClient()
  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState({ name: '', slug: '', highlight: '', sort_order: '0' })
  const [busy, setBusy]   = useState(false)

  const add = async () => {
    if (!form.name || !form.slug) { showToast('error', 'Name and slug required'); return }
    setBusy(true)
    const { error } = await sb.from('areas').insert({
      city_id:    cityId,
      city_slug:  citySlug,
      name:       form.name,
      slug:       form.slug,
      highlight:  form.highlight,
      sort_order: parseInt(form.sort_order) || 0,
      is_active:  true,
    })
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Area added')
    setForm({ name: '', slug: '', highlight: '', sort_order: '0' })
    setOpen(false)
    onAdded()
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="admin-btn-primary">
        <Plus className="w-4 h-4" /> Add Area
      </button>
      {open && (
        <div className="admin-card p-4 mt-3 space-y-3 border-dashed">
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Name *"  value={form.name}  onChange={v => setForm(p=>({...p,name:v}))} placeholder="Koramangala" />
            <Inp label="Slug *"  value={form.slug}  onChange={v => setForm(p=>({...p,slug:v}))} placeholder="koramangala" />
          </div>
          <Inp label="Highlight" value={form.highlight} onChange={v => setForm(p=>({...p,highlight:v}))} placeholder="IT Hub" />
          <Inp label="Sort Order" value={form.sort_order} onChange={v => setForm(p=>({...p,sort_order:v}))} />
          <button onClick={add} disabled={busy} className="admin-btn-primary">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Area
          </button>
        </div>
      )}
    </div>
  )
}

// ── Generic editable row (highlights, testimonials, faqs) ────────────────────
function EditableRow({ row, table, fields, onSave }: {
  row: Record<string, unknown>
  table: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' }[]
  onSave: () => void
}) {
  const sb = getBrowserClient()
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, String(row[f.key] ?? '')]))
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const payload: Record<string, unknown> = {}
    fields.forEach(f => {
      payload[f.key] = f.type === 'number' ? (parseFloat(form[f.key]) || 0) : form[f.key]
    })
    const { error } = await sb.from(table).update(payload).eq('id', row.id)
    setSaving(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Saved')
    onSave()
  }

  const del = async () => {
    if (!confirm('Delete this row?')) return
    const { error } = await sb.from(table).delete().eq('id', row.id)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Deleted')
    onSave()
  }

  const preview = fields.find(f => f.key === 'title' || f.key === 'name' || f.key === 'question')
  const previewVal = preview ? String(row[preview.key] ?? '').slice(0, 60) : String(row.id).slice(0, 8)

  return (
    <div className="admin-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1e2133] transition-colors text-left">
        {expanded ? <ChevronDown className="w-4 h-4 text-[#6b7280]" /> : <ChevronRight className="w-4 h-4 text-[#6b7280]" />}
        <span className="flex-1 text-sm text-[#e2e8f0] truncate">{previewVal}</span>
        <span className="text-xs text-[#6b7280]">Sort: {String(row.sort_order ?? 0)}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#2a2d3e] pt-4 space-y-3">
          {fields.map(f => (
            f.type === 'textarea'
              ? <div key={f.key}><label className="admin-label">{f.label}</label>
                  <textarea value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                    rows={4} className="admin-textarea" /></div>
              : <Inp key={f.key} label={f.label} value={form[f.key]} onChange={v => setForm(p=>({...p,[f.key]:v}))} />
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={del} className="admin-btn-danger"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add Row button (generic) ───────────────────────────────────────────────────
function AddRowButton({ table, parentKey, parentId, fields, onAdded }: {
  table: string
  parentKey: string
  parentId: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' }[]
  onAdded: () => void
}) {
  const sb = getBrowserClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.key, '']))
  )
  const [busy, setBusy] = useState(false)

  const add = async () => {
    setBusy(true)
    const payload: Record<string, unknown> = { [parentKey]: parentId }
    fields.forEach(f => {
      payload[f.key] = f.type === 'number' ? (parseFloat(form[f.key]) || 0) : form[f.key]
    })
    const { error } = await sb.from(table).insert(payload)
    setBusy(false)
    if (error) { showToast('error', error.message); return }
    showToast('success', 'Added')
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
          {fields.map(f => (
            f.type === 'textarea'
              ? <div key={f.key}><label className="admin-label">{f.label}</label>
                  <textarea value={form[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                    rows={3} className="admin-textarea" /></div>
              : <Inp key={f.key} label={f.label} value={form[f.key]} onChange={v => setForm(p=>({...p,[f.key]:v}))} />
          ))}
          <button onClick={add} disabled={busy} className="admin-btn-primary">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      )}
    </div>
  )
}

// ── CSP Card — links to city-service-pages/[id] editor ────────────────────────
function CSPCard({ csp, citySlug, onSave }: { csp: CSP; citySlug: string; onSave: () => void }) {
  const cat = csp.service_categories as Record<string,unknown> | null
  return (
    <Link href={`/city-service-pages/${csp.id}`}
      className="admin-card flex items-center gap-4 px-5 py-4 hover:border-blue-500/30 transition-all group">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#e2e8f0] text-sm group-hover:text-blue-300 transition-colors">
          {String(cat?.title ?? csp.category_slug)}
        </p>
        <p className="text-xs text-[#6b7280] truncate mt-0.5">
          /{citySlug}/services/{String(csp.category_slug)}
        </p>
        <p className="text-xs text-[#6b7280] mt-1 truncate">
          {String(csp.hero_heading ?? '').slice(0,80) || '— no hero heading yet'}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!csp.is_active && <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
        <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-blue-400 transition-colors" />
      </div>
    </Link>
  )
}

// ── Tiny input component ───────────────────────────────────────────────────────
function Inp({ label, value, onChange, placeholder }: {
  label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="admin-input" />
    </div>
  )
}

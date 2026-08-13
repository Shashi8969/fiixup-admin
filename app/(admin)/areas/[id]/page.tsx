'use client'
// app/(admin)/areas/[id]/page.tsx
// Full area-page editor — mirrors app/(admin)/location-services/[id]/page.tsx's
// structure and save patterns exactly (direct getBrowserClient() writes, no
// server actions — see that file for the precedent this follows).
//
// Every field fn_build_area_seo_page() reads from `areas` is editable here:
// hero/about copy, stats/trust-point overrides (fall back to the city's when
// blank), local insight, SEO content (intro/sections/conclusion/content
// blocks), related-post curation, schema overrides, meta title/description,
// and page layout (section order/visibility/heading — areas.page_layout).
// Testimonials, FAQs and services themselves stay fully live-rolled-up from
// this area's Location Services entries — not per-area columns, so they
// have no fields here; edit them on the relevant Location Service instead.

import { useEffect, useState, useCallback } from 'react'
import { useParams }        from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { Field }            from '@/components/ui/Field'
import { SchemaMultiSelector } from '@/components/schema/SchemaMultiSelector'
import { SeoMetaPanel }     from '@/components/seo/SeoMetaPanel'
import { AdminBackButton }  from '@/components/navigation/AdminBackButton'
import { LivePagePreview }  from '@/components/preview/LivePagePreview'
import { AreaPageLayoutEditor, type PageLayoutRow } from '@/components/areas/editor/AreaPageLayoutEditor'
import { publicSiteUrl }    from '@/lib/public-site'
import type { SchemaEntityType } from '@/utils/schema/schemaTypes'
import { showToast }        from '@/components/ui/Toast'
import { BlockEditor }      from '@/components/posts/editor/BlockEditor'
import { ImportContentModal } from '@/components/posts/editor/ImportContentModal'
import { LinkOptionsProvider } from '@/components/posts/editor/LinkOptionsContext'
import type { Block }       from '@/components/posts/editor/types'
import { toBlocks, stripIds } from '@/utils/posts/blockUtils'
import {
  ArrowLeft, ExternalLink, RefreshCw, Loader2, Globe, ClipboardPaste,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  Empty,
  JsonField,
  Toggle,
  s,
} from '@/components/location-services/editor/LocationServiceEditorParts'

const TABS = [
  { id: 'seo',         label: 'SEO'         },
  { id: 'details',     label: 'Details'     },
  { id: 'hero',        label: 'Hero'        },
  { id: 'about',       label: 'About'       },
  { id: 'stats_trust',  label: 'Stats & Trust' },
  { id: 'seo_content', label: 'SEO Content' },
  { id: 'schema',      label: 'Schema'      },
  { id: 'layout',      label: 'Page Layout' },
  { id: 'preview',     label: 'Preview'     },
  { id: 'indexing',    label: 'Indexing'    },
] as const
type TabId = typeof TABS[number]['id']

type Row = Record<string, unknown>

export default function AreaEditorPage() {
  const { id } = useParams() as { id: string }
  const sb     = getBrowserClient()

  const [tab,       setTab]       = useState<TabId>('details')
  const [loading,   setLoading]   = useState(true)
  const [area,      setArea]      = useState<Row | null>(null)
  const [seoPage,   setSeoPage]   = useState<Row | null>(null)
  const [analytics, setAnalytics] = useState<Row | null>(null)
  const [blocks,    setBlocks]    = useState<Block[]>([])
  const [savingBlocks, setSavingBlocks] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: areaData } = await sb.from('areas').select('*').eq('id', id).single()
    if (!areaData) { setLoading(false); return }
    setArea(areaData)
    setBlocks(toBlocks(areaData.content_blocks))

    const { data: sp } = await sb
      .from('seo_pages').select('*').eq('area_id', id).eq('page_type', 'area_hub').maybeSingle()
    setSeoPage(sp ?? null)

    if (sp?.url_path) {
      const { data: an } = await sb
        .from('page_analytics').select('*').eq('url_path', sp.url_path).maybeSingle()
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
  if (!area) return <div className="text-red-400 p-8">Area not found: {id}</div>

  // ── Save closures — mirrors location-services/[id]/page.tsx's saveLS* set ──
  const saveArea = (col: string) => async (val: unknown) => {
    const { error } = await sb.from('areas')
      .update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setArea(p => p ? { ...p, [col]: val } : p)
    showToast('success', 'Saved — seo_pages rebuilding automatically')
    return { success: true, message: 'Saved' }
  }

  const saveAreaNum = (col: string) => async (val: string) => {
    const parsed = parseFloat(val.trim())
    const num = val.trim() === '' || !Number.isFinite(parsed) ? null : parsed
    const { error } = await sb.from('areas')
      .update({ [col]: num, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setArea(p => p ? { ...p, [col]: num } : p)
    showToast('success', 'Saved')
    return { success: true, message: 'Saved' }
  }

  const saveAreaJson = (col: string) => async (val: string) => {
    try {
      const parsed = JSON.parse(val)
      const { error } = await sb.from('areas')
        .update({ [col]: parsed, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) { showToast('error', error.message); return { success: false, error: error.message } }
      setArea(p => p ? { ...p, [col]: parsed } : p)
      showToast('success', 'Saved')
      return { success: true, message: 'Saved' }
    } catch { return { success: false, error: 'Invalid JSON' } }
  }

  const saveAreaBool = async (col: string, val: boolean) => {
    const { error } = await sb.from('areas')
      .update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return }
    setArea(p => p ? { ...p, [col]: val } : p)
    showToast('success', 'Saved')
  }

  // areas has no schema_json column (unlike location_services) — only
  // schema_types + schema_overrides, so the SchemaMultiSelector payload's
  // schema_json key is intentionally dropped before writing.
  const saveAreaSchema = async (payload: { schema_types: SchemaEntityType[]; schema_overrides: Record<string, unknown> }) => {
    const { error } = await sb.from('areas')
      .update({
        schema_types: payload.schema_types,
        schema_overrides: payload.schema_overrides,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setArea(p => p ? { ...p, schema_types: payload.schema_types, schema_overrides: payload.schema_overrides } : p)
    return { success: true, message: 'Schema overrides saved' }
  }

  const saveLayout = async (rows: PageLayoutRow[]) => {
    setSavingLayout(true)
    await saveArea('page_layout')(rows)
    setSavingLayout(false)
  }

  const saveContentBlocks = async (bl: Block[]) => {
    setSavingBlocks(true)
    const stripped = stripIds(bl)
    const { error } = await sb.from('areas')
      .update({ content_blocks: stripped, updated_at: new Date().toISOString() }).eq('id', id)
    setSavingBlocks(false)
    if (error) { showToast('error', error.message); return }
    setBlocks(bl)
    setArea(p => p ? { ...p, content_blocks: stripped } : p)
    showToast('success', 'Content blocks saved')
  }

  const liveUrl = publicSiteUrl(`/${s(area.city_slug)}/${s(area.slug)}`)

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBackButton fallbackHref="/areas"
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </AdminBackButton>
          <div>
            <h1 className="admin-page-title">{s(area.name)}</h1>
            <div className="text-xs text-[#6b7280] mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="bg-[#2a2d3e] px-2 py-0.5 rounded-full">{s(area.city_slug)}</span>
              <span className="bg-[#2a2d3e] px-2 py-0.5 rounded-full">/{s(area.slug)}</span>
              <Toggle value={Boolean(area.is_active)} onChange={v => saveAreaBool('is_active', v)} label="Active" />
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
          title={s(area.meta_title)}
          description={s(area.meta_description)}
          urlPath={liveUrl}
          onSaveTitle={saveArea('meta_title')}
          onSaveDescription={saveArea('meta_description')}
          extraFields={
            <p className="text-xs text-[#6b7280]">
              Leave either field blank to use the auto-generated default (area + city name, and a standard
              service description) — matches the fallback shown on the Indexing tab.
            </p>
          }
        />
      )}

      {/* ══════════════ DETAILS ══════════════ */}
      {tab === 'details' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Area Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={s(area.name)} onSave={saveArea('name')} />
            <Field label="Slug" value={s(area.slug)} onSave={saveArea('slug')} />
          </div>
          <div>
            <Field label="Highlight" value={s(area.highlight)} onSave={saveArea('highlight')} multiline rows={2} />
            <p className="text-xs text-[#6b7280] mt-1.5">
              Feeds the auto-generated About paragraph 1 when set — a short line describing what makes this area distinct.
            </p>
          </div>
          <div>
            <Field label="Vehicles Serviced" value={s(area.vehicles_serviced)} numeric onSave={saveAreaNum('vehicles_serviced')} />
            <p className="text-xs text-[#6b7280] mt-1.5">
              Real count for this area — feeds the auto-generated About paragraph 2 and rolls up into city/homepage totals.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Sort Order" value={s(area.sort_order)} numeric onSave={saveAreaNum('sort_order')} />
            <Field label="Latitude"   value={s(area.latitude)}   numeric onSave={saveAreaNum('latitude')} />
            <Field label="Longitude"  value={s(area.longitude)}  numeric onSave={saveAreaNum('longitude')} />
          </div>
          <p className="text-xs text-[#6b7280]">
            Stats and trust points default to the city&apos;s (Cities → {s(area.city_slug)}) but can be overridden
            per area on the Stats &amp; Trust tab. Services, testimonials and FAQs shown on this page are rolled up
            live from this area&apos;s Location Services entries.
          </p>
        </div>
      )}

      {/* ══════════════ HERO ══════════════ */}
      {tab === 'hero' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Hero Section</h2>
          <p className="text-xs text-[#6b7280]">
            Leave either field blank to use the auto-generated default (area + city name, and a generic booking
            sentence) — an empty field here isn&apos;t broken, it just means nothing has been customized yet.
          </p>
          <Field label="Hero Heading" value={s(area.hero_heading)} onSave={saveArea('hero_heading')} multiline rows={2} />
          <Field label="Hero Subheading" value={s(area.hero_subheading)} onSave={saveArea('hero_subheading')} multiline rows={3} />
        </div>
      )}

      {/* ══════════════ ABOUT ══════════════ */}
      {tab === 'about' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">About Section</h2>
          <div>
            <Field label="About Heading" value={s(area.about_heading)} onSave={saveArea('about_heading')} />
            <p className="text-xs text-[#6b7280] mt-1.5">
              Leave blank to use the default: &quot;Trusted Doorstep Auto Repair in {s(area.name)}&quot;.
            </p>
          </div>
          <div>
            <Field label="Local Insight" value={s(area.local_insight)} onSave={saveArea('local_insight')} multiline rows={4} />
            <p className="text-xs text-[#6b7280] mt-1.5">
              A short "local note" callout shown under the About copy (e.g. landmarks, traffic patterns, block-level
              routing tips). About paragraphs 1 &amp; 2 themselves are auto-generated from Details → Highlight and
              Vehicles Serviced on the Details tab.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════ STATS & TRUST ══════════════ */}
      {tab === 'stats_trust' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Stats &amp; Trust Points</h2>
          <p className="text-xs text-[#6b7280]">
            Shown in this area&apos;s Trust Marquee and About stat panel. Leave any field blank to inherit the
            city&apos;s value (Cities → {s(area.city_slug)}) — filling one in overrides it for this area only.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Customers (e.g. 5,000+)"    value={s(area.stats_customers)}    onSave={saveArea('stats_customers')} />
            <Field label="Satisfaction (e.g. 98%)"    value={s(area.stats_satisfaction)} onSave={saveArea('stats_satisfaction')} />
            <Field label="Coverage (e.g. Full Area)"  value={s(area.stats_coverage)}     onSave={saveArea('stats_coverage')} />
          </div>
          <JsonField
            key={JSON.stringify(area.trust_points)}
            label='Trust Points ["point 1", "point 2", ...]'
            value={area.trust_points}
            onSave={saveAreaJson('trust_points')}
          />
        </div>
      )}

      {/* ══════════════ SEO CONTENT ══════════════ */}
      {tab === 'seo_content' && (
        <div className="space-y-5">
          <LinkOptionsProvider>
            <div className="admin-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="admin-section-title">Content Blocks (recommended)</h2>
                  <p className="text-xs text-[#6b7280] mt-1">
                    Same paste/import + block editor as blog posts and location services — paste an article and it&apos;s
                    auto-converted into blocks below. FAQ and Steps blocks here also feed this page&apos;s FAQPage/HowTo schema.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowImport(true)} className="admin-btn-secondary text-xs">
                    <ClipboardPaste className="w-4 h-4" /> Paste / Import Content
                  </button>
                  <button onClick={() => saveContentBlocks(blocks)} disabled={savingBlocks} className="admin-btn-primary text-xs">
                    {savingBlocks ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Content Blocks
                  </button>
                </div>
              </div>

              {showImport && (
                <ImportContentModal
                  hasExistingBlocks={blocks.length > 0}
                  onClose={() => setShowImport(false)}
                  onInsert={(newBlocks, mode) => {
                    setBlocks(mode === 'replace' ? newBlocks : [...blocks, ...newBlocks])
                    setShowImport(false)
                  }}
                />
              )}

              <BlockEditor blocks={blocks} onChange={setBlocks} />

              <div className="flex justify-end">
                <button onClick={() => saveContentBlocks(blocks)} disabled={savingBlocks} className="admin-btn-primary">
                  {savingBlocks ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Content Blocks
                </button>
              </div>
            </div>
          </LinkOptionsProvider>

          <div className="admin-card p-6 space-y-4">
            <h2 className="admin-section-title">Legacy Fields (still supported)</h2>
            <Field label="SEO Intro Heading" value={s(area.seo_intro_heading)} onSave={saveArea('seo_intro_heading')} />
            <Field label="SEO Intro Body"    value={s(area.seo_intro_body)}    onSave={saveArea('seo_intro_body')} multiline rows={6} />
            <Field label="SEO Conclusion"    value={s(area.seo_conclusion)}    onSave={saveArea('seo_conclusion')} multiline rows={4} />
            <JsonField
              key={JSON.stringify(area.seo_sections)}
              label="SEO Sections [{heading, body}]"
              value={area.seo_sections}
              onSave={saveAreaJson('seo_sections')}
            />
          </div>

          <div className="admin-card p-6 space-y-4">
            <h2 className="admin-section-title">Related Posts</h2>
            <p className="text-xs text-[#6b7280]">
              Manually curate which blog posts show in this area&apos;s "Helpful Guides" section. Leave empty to keep
              auto-matching posts by title/tag against this area and city name.
            </p>
            <JsonField
              key={JSON.stringify(area.related_posts)}
              label='Related Posts [{slug, title, category}]'
              value={area.related_posts}
              onSave={saveAreaJson('related_posts')}
            />
          </div>
        </div>
      )}

      {/* ══════════════ SCHEMA ══════════════ */}
      {tab === 'schema' && (
        <SchemaMultiSelector
          kind="area"
          record={area}
          urlPath={liveUrl}
          selectedTypes={(Array.isArray(area.schema_types) ? area.schema_types : undefined) as SchemaEntityType[] | undefined}
          overrides={(area.schema_overrides && typeof area.schema_overrides === 'object' ? area.schema_overrides : {}) as Record<string, unknown>}
          onSave={saveAreaSchema}
        />
      )}

      {/* ══════════════ PAGE LAYOUT ══════════════ */}
      {tab === 'layout' && (
        <div className="admin-card p-6">
          <h2 className="admin-section-title mb-1">Page Layout</h2>
          <AreaPageLayoutEditor
            key={JSON.stringify(area.page_layout)}
            value={(Array.isArray(area.page_layout) ? area.page_layout : []) as PageLayoutRow[]}
            onSave={saveLayout}
            saving={savingLayout}
          />
        </div>
      )}

      {/* ══════════════ PREVIEW ══════════════ */}
      {tab === 'preview' && (
        <LivePagePreview
          title={`Area preview — ${s(area.name)}`}
          url={liveUrl}
          description="Loads the real Fiixup area page. Save changes first, then reload the preview to verify the live layout."
        />
      )}

      {/* ══════════════ INDEXING ══════════════ */}
      {tab === 'indexing' && (
        <div className="space-y-4">
          <div className="admin-card p-6">
            <h2 className="admin-section-title flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-blue-400" /> SEO Page Status
            </h2>
            {seoPage ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <p className="text-[#6b7280] text-xs">URL Path</p>
                    <p className="text-[#e2e8f0] font-mono text-xs mt-0.5">{s(seoPage.url_path)}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] text-xs">Page Type</p>
                    <p className="text-[#e2e8f0] text-xs mt-0.5">{s(seoPage.page_type)}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] text-xs">Meta Title</p>
                    <p className="text-[#e2e8f0] text-xs mt-0.5">{s(seoPage.meta_title)}</p>
                  </div>
                  <div>
                    <p className="text-[#6b7280] text-xs">Last Updated</p>
                    <p className="text-[#e2e8f0] text-xs mt-0.5">
                      {seoPage.updated_at ? new Date(s(seoPage.updated_at)).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#6b7280]">
                  Meta title/description are editable on the SEO tab. This status panel is read-only except the
                  flags below.
                </p>
              </>
            ) : (
              <p className="text-[#6b7280] text-sm">No seo_pages entry found for this area yet.</p>
            )}
          </div>

          {seoPage && (
            <div className="admin-card p-6">
              <h2 className="admin-section-title mb-4">Indexing Flags</h2>
              <div className="space-y-3">
                {['is_active', 'is_indexed'].map(col => (
                  <div key={col} className="flex items-center justify-between py-2 border-b border-[#2a2d3e] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#e2e8f0]">{col}</p>
                      <p className="text-xs text-[#6b7280]">
                        {col === 'is_active' ? 'Show this page on the site' : 'Allow search engines to index this page'}
                      </p>
                    </div>
                    <Toggle
                      value={Boolean(seoPage[col])}
                      onChange={async (val) => {
                        const { error } = await sb.from('seo_pages')
                          .update({ [col]: val }).eq('url_path', s(seoPage.url_path))
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

          {analytics && (
            <div className="admin-card p-6">
              <h2 className="admin-section-title mb-4">Page Analytics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Impressions',  value: s(analytics.impressions) || '—' },
                  { label: 'Clicks',       value: s(analytics.clicks)      || '—' },
                  { label: 'Avg Position', value: analytics.avg_position ? `#${s(analytics.avg_position)}` : '—' },
                  { label: 'Crawl Count',  value: s(analytics.crawl_count) || '—' },
                ].map(item => (
                  <div key={item.label} className="bg-[#0f1117] rounded-xl p-4 text-center">
                    <p className="text-lg font-bold text-[#e2e8f0]">{item.value}</p>
                    <p className="text-xs text-[#6b7280] mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!analytics && <Empty>No analytics data yet for this page.</Empty>}
        </div>
      )}
    </div>
  )
}

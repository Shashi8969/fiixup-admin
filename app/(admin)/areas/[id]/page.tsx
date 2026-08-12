'use client'
// app/(admin)/areas/[id]/page.tsx
// Area editor — Overview (mirrors the inline fields on the city editor's
// AreaRow) + SEO Content (content_blocks block editor + legacy seo_* fields,
// same machinery as posts/location-services/city-service-pages) + Schema.
//
// areas.seo_intro_heading/seo_intro_body/seo_sections/seo_conclusion already
// existed on the DB and are already read by fn_build_area_seo_page() — this
// page is what finally exposes them (and the new content_blocks column) in
// the admin UI. Areas save directly via the browser Supabase client, same as
// the AreaRow quick-editor on the city page (no server action layer exists
// for `areas` yet).

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase'
import { Field } from '@/components/ui/Field'
import { SchemaMultiSelector } from '@/components/schema/SchemaMultiSelector'
import { AdminBackButton } from '@/components/navigation/AdminBackButton'
import { publicSiteUrl } from '@/lib/public-site'
import type { SchemaEntityType } from '@/utils/schema/schemaTypes'
import { showToast } from '@/components/ui/Toast'
import { BlockEditor } from '@/components/posts/editor/BlockEditor'
import { ImportContentModal } from '@/components/posts/editor/ImportContentModal'
import { LinkOptionsProvider } from '@/components/posts/editor/LinkOptionsContext'
import type { Block } from '@/components/posts/editor/types'
import { toBlocks, stripIds } from '@/utils/posts/blockUtils'
import { JsonField, Toggle, s } from '@/components/city-service-pages/editor/CityServicePageEditorParts'
import { ArrowLeft, ExternalLink, Loader2, MapPin, RefreshCw, ClipboardPaste } from 'lucide-react'
import { clsx } from 'clsx'

const TABS = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'seo_content', label: 'SEO Content' },
  { id: 'schema',      label: 'Schema'      },
] as const
type TabId = typeof TABS[number]['id']

type Row = Record<string, unknown>

export default function AreaEditorPage() {
  const { id } = useParams() as { id: string }
  const sb = getBrowserClient()

  const [tab, setTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(true)
  const [area, setArea] = useState<Row | null>(null)
  const [city, setCity] = useState<Row | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [savingBlocks, setSavingBlocks] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await sb
      .from('areas')
      .select('*, cities(name, slug, phone)')
      .eq('id', id)
      .single()
    if (!data) { setLoading(false); return }
    setArea(data)
    setCity((data.cities as Row) ?? null)
    setBlocks(toBlocks(data.content_blocks))
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!area) return <div className="text-red-400 p-8">Area not found: {id}</div>

  const citySlug = s(city?.slug ?? area.city_slug)
  const areaSlug = s(area.slug)
  const liveUrl = publicSiteUrl(`/${citySlug}/${areaSlug}`)

  const save = (col: string) => async (val: unknown) => {
    const { error } = await sb.from('areas')
      .update({ [col]: val, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { showToast('error', error.message); return { success: false, error: error.message } }
    setArea(p => p ? { ...p, [col]: val } : p)
    showToast('success', 'Saved')
    return { success: true, message: 'Saved' }
  }

  const saveNum = (col: string) => async (val: string) => {
    const num = col === 'latitude' || col === 'longitude' ? parseFloat(val) || null : parseInt(val, 10) || 0
    return save(col)(num)
  }

  const saveJson = (col: string) => async (val: string) => {
    try {
      const parsed = JSON.parse(val)
      return await save(col)(parsed)
    } catch { return { success: false, error: 'Invalid JSON' } }
  }

  const saveBool = async (col: string, val: boolean) => { await save(col)(val) }

  const savePatch = async (patch: Record<string, unknown>) => {
    const { error } = await sb.from('areas')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setArea(p => p ? { ...p, ...patch } : p)
    return { success: true, message: 'Schema saved' }
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

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AdminBackButton fallbackHref={`/cities/${citySlug}`}
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </AdminBackButton>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              {s(area.name)}
              <span className="text-[#6b7280] font-normal text-sm">in {s(city?.name ?? citySlug)}</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-[#2a2d3e] text-[#94a3b8] px-2 py-0.5 rounded-full">/{citySlug}/{areaSlug}</span>
              <Toggle value={Boolean(area.is_active)} onChange={v => saveBool('is_active', v)} label="Active" />
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

      {/* ════════════ OVERVIEW ════════════ */}
      {tab === 'overview' && (
        <div className="admin-card p-6 space-y-4">
          <h2 className="admin-section-title">Area Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={s(area.name)} onSave={save('name')} />
            <Field label="Slug" value={s(area.slug)} onSave={save('slug')} />
          </div>
          <Field label="Highlight text" value={s(area.highlight)} onSave={save('highlight')} />
          <Field label="Local Insight" value={s(area.local_insight)} onSave={save('local_insight')} multiline rows={3} />
          <Field label="Vehicles Serviced (real count — sums into city + homepage totals)"
            value={s(area.vehicles_serviced)} numeric onSave={saveNum('vehicles_serviced')} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Sort Order" value={s(area.sort_order)} numeric onSave={saveNum('sort_order')} />
            <Field label="Latitude"   value={s(area.latitude)}   numeric onSave={saveNum('latitude')} />
            <Field label="Longitude"  value={s(area.longitude)}  numeric onSave={saveNum('longitude')} />
          </div>
        </div>
      )}

      {/* ════════════ SCHEMA ════════════ */}
      {tab === 'schema' && (
        <SchemaMultiSelector
          kind="area"
          record={area}
          urlPath={`/${citySlug}/${areaSlug}`}
          blocks={blocks}
          selectedTypes={(Array.isArray(area.schema_types) ? area.schema_types : undefined) as SchemaEntityType[] | undefined}
          overrides={(area.schema_overrides && typeof area.schema_overrides === 'object' ? area.schema_overrides : {}) as Record<string, unknown>}
          onSave={savePatch}
        />
      )}

      {/* ════════════ SEO CONTENT ════════════ */}
      {tab === 'seo_content' && (
        <div className="space-y-5">
          <LinkOptionsProvider>
            <div className="admin-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="admin-section-title">Content Blocks (recommended)</h2>
                  <p className="text-xs text-[#6b7280] mt-1">
                    Same paste/import + block editor as blog posts, location services and city
                    service pages — paste an article and it&apos;s auto-converted into blocks below.
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
            <Field label="SEO Intro Heading" value={s(area.seo_intro_heading)} onSave={save('seo_intro_heading')} />
            <Field label="SEO Intro Body"    value={s(area.seo_intro_body)}    onSave={save('seo_intro_body')} multiline rows={6} />
            <Field label="SEO Conclusion"    value={s(area.seo_conclusion)}    onSave={save('seo_conclusion')} multiline rows={4} />
            <JsonField
              label="SEO Sections"
              hint='[{"heading":"...","body":"..."}]'
              value={area.seo_sections}
              onSave={saveJson('seo_sections')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
// app/(admin)/posts/[slug]/page.tsx
// ── Full Blog Post Editor ─────────────────────────────────────────────────────
// NEW: char counters + SERP preview | WebP compressor | Schema chooser/builder
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef, useCallback, ChangeEvent } from 'react'
import { useParams }        from 'next/navigation'
import Link                 from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { Field }            from '@/components/ui/Field'
import { showToast }        from '@/components/ui/Toast'
import { savePost }         from '@/lib/actions'
import {
  ArrowLeft, ExternalLink, Loader2, RefreshCw, FileText,
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Eye, Code2,
  Type, List, Table, Image as ImageIcon, Quote, Minus, Megaphone,
  HelpCircle, Footprints, Link2, LayoutGrid, BarChart3, CheckSquare,
  AlertTriangle, Upload, Zap, Copy, Check,
} from 'lucide-react'
import { clsx } from 'clsx'

// ═══════════════════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Block = Record<string, unknown> & { type: string; _id: string }
type SchemaType = 'none' | 'BlogPosting' | 'Article' | 'NewsArticle' | 'FAQPage' | 'HowTo'

const TABS = ['SEO', 'Schema', 'Content', 'Settings'] as const
type Tab = typeof TABS[number]

// ═══════════════════════════════════════════════════════════════════════════════
//  SEO — CHARACTER COUNTER
// ═══════════════════════════════════════════════════════════════════════════════

const SEO_LIMITS = {
  meta_title:       { min: 40, ideal: 60, max: 70  },
  meta_description: { min: 100, ideal: 155, max: 165 },
} as const

function CharCounter({ value, field }: { value: string; field: keyof typeof SEO_LIMITS }) {
  const len    = value.length
  const limits = SEO_LIMITS[field]
  const state  =
    len === 0           ? 'empty'   :
    len < limits.min    ? 'short'   :
    len <= limits.ideal ? 'perfect' :
    len <= limits.max   ? 'long'    : 'over'

  const labelMap  = { empty: 'Empty', short: 'Too short', perfect: '✓ Perfect', long: 'Getting long', over: 'Too long' }
  const colorText = { empty: 'text-[#6b7280]', short: 'text-amber-400', perfect: 'text-green-400', long: 'text-amber-400', over: 'text-red-400' }
  const colorBar  = { empty: 'bg-[#2a2d3e]',   short: 'bg-amber-400',   perfect: 'bg-green-400',   long: 'bg-amber-400',  over: 'bg-red-500'   }
  const pct       = Math.min(len / limits.max, 1)

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex justify-between">
        <span className={clsx('text-xs font-medium', colorText[state])}>{labelMap[state]}</span>
        <span className={clsx('text-xs tabular-nums', colorText[state])}>
          {len} / {limits.ideal}
          <span className="text-[#6b7280]"> (max {limits.max})</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-[#2a2d3e] overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-200', colorBar[state])} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  )
}

// ─── SERP Preview ─────────────────────────────────────────────────────────────

function SerpPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  const t = title       || 'Page Title'
  const d = description || 'Meta description will appear here in Google search results…'
  return (
    <div className="rounded-xl bg-white p-4 space-y-0.5 border border-gray-200 shadow-sm">
      <p className="text-xs" style={{ color: '#202124', fontFamily: 'arial,sans-serif' }}>
        <span style={{ color: '#4d5156' }}>fiixup.in</span>
        <span style={{ color: '#4d5156' }}> › blog › {slug || 'post-slug'}</span>
      </p>
      <p className="text-base font-medium leading-snug line-clamp-1" style={{ color: '#1a0dab', fontFamily: 'arial,sans-serif' }}>
        {t.length > 70 ? t.slice(0, 67) + '…' : t}
      </p>
      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: '#4d5156', fontFamily: 'arial,sans-serif' }}>
        {d.length > 165 ? d.slice(0, 162) + '…' : d}
      </p>
    </div>
  )
}

// ─── MetaField wrapper ────────────────────────────────────────────────────────

function MetaField({
  label, value, field, onSave, multiline, rows,
}: {
  label: string; value: string; field: keyof typeof SEO_LIMITS
  onSave: (v: string) => Promise<{ success: boolean; error?: string; message?: string }>
  multiline?: boolean; rows?: number
}) {
  const [live, setLive] = useState(value)
  useEffect(() => setLive(value), [value])
  return (
    <div>
      <Field label={label} value={live} multiline={multiline} rows={rows}
        onSave={async (v) => { setLive(v); return onSave(v) }} />
      <CharCounter value={live} field={field} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WEBP COMPRESSOR
// ═══════════════════════════════════════════════════════════════════════════════

function WebPCompressor() {
  const [status,  setStatus]  = useState<'idle'|'working'|'done'|'error'>('idle')
  const [preview, setPreview] = useState('')
  const [info,    setInfo]    = useState<{ before: number; after: number; w: number; h: number } | null>(null)
  const [quality, setQuality] = useState(82)
  const [maxW,    setMaxW]    = useState(1200)
  const [copied,  setCopied]  = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const blobRef  = useRef<Blob | null>(null)

  const compress = useCallback((file: File, q: number, mw: number) => {
    setStatus('working')
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale  = Math.min(1, mw / img.naturalWidth)
      const w      = Math.round(img.naturalWidth  * scale)
      const h      = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => {
        if (!blob) { setStatus('error'); return }
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setPreview(url)
        setInfo({ before: file.size, after: blob.size, w, h })
        setStatus('done')
      }, 'image/webp', q / 100)
    }
    img.onerror = () => setStatus('error')
    img.src = objectUrl
  }, [])

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    compress(f, quality, maxW)
    e.target.value = ''
  }

  const download = () => {
    if (!blobRef.current) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blobRef.current)
    a.download = `compressed-${Date.now()}.webp`
    a.click()
  }

  const fmt = (b: number) =>
    b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : `${Math.round(b / 1024)} KB`

  return (
    <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-[#e2e8f0]">WebP Compressor</span>
        <span className="text-xs text-[#6b7280]">client-side · no upload needed</span>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="admin-label mb-1 block">Quality: <span className="text-white">{quality}%</span></label>
          <input type="range" min={40} max={95} value={quality}
            onChange={(e) => setQuality(+e.target.value)}
            className="w-full h-1.5 rounded accent-amber-400" />
          <div className="flex justify-between text-xs text-[#6b7280] mt-0.5"><span>Smaller</span><span>Sharper</span></div>
        </div>
        <div>
          <label className="admin-label mb-1 block">Max width: <span className="text-white">{maxW}px</span></label>
          <input type="range" min={400} max={2400} step={100} value={maxW}
            onChange={(e) => setMaxW(+e.target.value)}
            className="w-full h-1.5 rounded accent-amber-400" />
          <div className="flex justify-between text-xs text-[#6b7280] mt-0.5"><span>400px</span><span>2400px</span></div>
        </div>
      </div>

      {/* Drop zone */}
      <button onClick={() => fileRef.current?.click()}
        className="w-full border-2 border-dashed border-[#2a2d3e] hover:border-amber-500/40 rounded-xl p-5 text-center transition-colors group">
        {status === 'idle' && (
          <div className="space-y-2">
            <Upload className="w-7 h-7 text-[#6b7280] group-hover:text-amber-400 mx-auto transition-colors" />
            <p className="text-sm text-[#9ca3af]">Click to pick an image</p>
            <p className="text-xs text-[#6b7280]">JPG / PNG / WEBP → compressed WebP</p>
          </div>
        )}
        {status === 'working' && <Loader2 className="w-7 h-7 text-amber-400 animate-spin mx-auto" />}
        {status === 'error'   && <p className="text-red-400 text-sm">Error — try another image</p>}
        {status === 'done' && info && (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <img src={preview} alt="preview" className="max-h-44 mx-auto rounded-lg object-contain" />
            {/* Stats row */}
            <div className="flex justify-center gap-5">
              {[
                { label: 'Before',  value: fmt(info.before), color: 'text-[#9ca3af]' },
                { label: 'After',   value: fmt(info.after),  color: 'text-green-400' },
                { label: 'Saved',   value: `${Math.round((1 - info.after / info.before) * 100)}%`, color: 'text-green-400' },
                { label: 'Size',    value: `${info.w}×${info.h}`, color: 'text-[#e2e8f0]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-[#6b7280]">{label}</p>
                  <p className={clsx('text-sm font-bold', color)}>{value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={download}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg transition-colors">
                ↓ Download WebP
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="text-xs text-[#6b7280] hover:text-white underline transition-colors">
                Pick another
              </button>
            </div>
          </div>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {status === 'done' && (
        <p className="text-xs text-[#6b7280] text-center">
          Upload the downloaded WebP to Supabase Storage → paste the URL in the OG Image field above.
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCHEMA BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEMA_OPTIONS: { value: SchemaType; label: string; desc: string; badge: string }[] = [
  { value: 'none',        label: 'None',        desc: 'No structured data',                        badge: 'bg-[#2a2d3e] text-[#6b7280]'       },
  { value: 'BlogPosting', label: 'BlogPosting',  desc: 'Guides, how-tos, editorial posts',          badge: 'bg-blue-500/10 text-blue-400'       },
  { value: 'Article',     label: 'Article',      desc: 'Generic editorial / informational content', badge: 'bg-purple-500/10 text-purple-400'   },
  { value: 'NewsArticle', label: 'NewsArticle',  desc: 'Breaking news, time-sensitive posts',       badge: 'bg-red-500/10 text-red-400'         },
  { value: 'FAQPage',     label: 'FAQPage',      desc: 'Unlocks FAQ rich results in Google',        badge: 'bg-green-500/10 text-green-400'     },
  { value: 'HowTo',       label: 'HowTo',        desc: 'Step-by-step guides with rich results',     badge: 'bg-amber-500/10 text-amber-400'     },
]

// Build JSON-LD from post + overrides + blocks (auto-reads faq/steps blocks)
function buildJsonLd(
  type: SchemaType,
  post: Record<string, unknown>,
  overrides: Record<string, string>,
  blocks: Block[],
): object | null {
  if (type === 'none') return null

  const siteUrl   = 'https://fiixup.in'
  const postUrl   = `${siteUrl}/blog/${post.slug}`
  const imgUrl    = String(post.image    || `${siteUrl}/assets/og-image.webp`)
  const datePubl  = String(post.date_proper || post.date || new Date().toISOString())
  const headline  = overrides.headline    || String(post.meta_title   || post.title || '')
  const desc      = overrides.description || String(post.meta_description || post.excerpt || '')
  const keywords  = overrides.keywords    || String(post.meta_keywords || '')
  const section   = overrides.articleSection || String(post.category  || 'Automotive')

  const author = {
    '@type': 'Person',
    name:     overrides.authorName || String(post.author      || 'Fiixup Team'),
    jobTitle: overrides.authorRole || String(post.author_role || 'Automotive Expert'),
  }
  const publisher = {
    '@type': 'Organization',
    name:    'Fiixup',
    logo:    { '@type': 'ImageObject', url: `${siteUrl}/assets/logo.png` },
  }

  // Auto-extract FAQ items from faq blocks
  const faqItems = blocks
    .filter((b) => b.type === 'faq')
    .flatMap((b) => (Array.isArray(b.items) ? b.items : []) as any[])
    .map((item) => ({
      '@type': 'Question',
      name:    String(item.question || ''),
      acceptedAnswer: { '@type': 'Answer', text: String(item.answer || '') },
    }))

  // Auto-extract steps from steps blocks
  const stepItems = blocks
    .filter((b) => b.type === 'steps')
    .flatMap((b) => (Array.isArray(b.items) ? b.items : []) as any[])
    .map((item, i) => ({
      '@type':    'HowToStep',
      position:   i + 1,
      name:       String(item.title       || ''),
      text:       String(item.description || ''),
    }))

  const base = { '@context': 'https://schema.org', '@type': type }

  switch (type) {
    case 'BlogPosting':
    case 'Article':
    case 'NewsArticle':
      return {
        ...base,
        headline,
        description:      desc,
        url:              postUrl,
        datePublished:    datePubl,
        dateModified:     overrides.dateModified || datePubl,
        author,
        publisher,
        image:            { '@type': 'ImageObject', url: imgUrl },
        keywords,
        articleSection:   section,
        inLanguage:       'en-IN',
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
        ...(faqItems.length > 0 ? { mainEntity: { '@type': 'FAQPage', mainEntity: faqItems } } : {}),
      }

    case 'FAQPage':
      return {
        ...base,
        mainEntity: faqItems.length > 0
          ? faqItems
          : [{ '@type': 'Question', name: 'Add FAQ blocks to auto-populate', acceptedAnswer: { '@type': 'Answer', text: '…' } }],
      }

    case 'HowTo':
      return {
        ...base,
        name:        overrides.howToName    || String(post.title   || ''),
        description: overrides.description  || desc,
        image:       imgUrl,
        totalTime:   overrides.totalTime    || 'PT30M',
        estimatedCost: {
          '@type':   'MonetaryAmount',
          currency:  'INR',
          value:     overrides.estimatedCost || '0',
        },
        step: stepItems.length > 0
          ? stepItems
          : [{ '@type': 'HowToStep', position: 1, name: 'Add Steps blocks to auto-populate', text: '…' }],
      }

    default: return base
  }
}

function SchemaBuilder({
  post, blocks, schemaType, setSchemaType, overrides, setOverrides,
}: {
  post: Record<string, unknown>
  blocks: Block[]
  schemaType: SchemaType
  setSchemaType: (t: SchemaType) => void
  overrides: Record<string, string>
  setOverrides: (o: Record<string, string>) => void
}) {
  const [showJson, setShowJson] = useState(false)
  const [copied,   setCopied]   = useState(false)

  const jsonLd  = buildJsonLd(schemaType, post, overrides, blocks)
  const jsonStr = jsonLd ? JSON.stringify(jsonLd, null, 2) : 'null'

  const setOv = (k: string, v: string) => setOverrides({ ...overrides, [k]: v })

  const copyJson = () => {
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  // Auto-detect recommended type based on block content
  const hasFaq   = blocks.some((b) => b.type === 'faq')
  const hasSteps = blocks.some((b) => b.type === 'steps')
  const recommended: SchemaType = hasSteps ? 'HowTo' : hasFaq ? 'FAQPage' : 'BlogPosting'

  return (
    <div className="space-y-5">

      {/* Auto-detect hint */}
      {schemaType === 'none' && (
        <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-[#9ca3af]">
            No schema selected. Based on your content blocks, we recommend{' '}
            <button className="text-blue-400 underline" onClick={() => setSchemaType(recommended)}>
              {recommended}
            </button>.
          </p>
        </div>
      )}

      {/* Type picker */}
      <div className="admin-card p-5 space-y-3">
        <p className="admin-section-title">Schema Type</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SCHEMA_OPTIONS.map(({ value, label, desc, badge }) => (
            <button key={value} onClick={() => setSchemaType(value)}
              className={clsx(
                'text-left p-3 rounded-xl border transition-all',
                schemaType === value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-[#2a2d3e] bg-[#0f1117] hover:border-[#3a3d4e]'
              )}>
              <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', badge)}>{label}</span>
              <p className="text-xs text-[#6b7280] mt-1.5 leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific override fields */}
      {schemaType !== 'none' && (
        <div className="admin-card p-5 space-y-4">
          <p className="admin-section-title">
            Overrides
            <span className="ml-2 text-xs text-[#6b7280] font-normal normal-case">
              — leave blank to auto-fill from post data
            </span>
          </p>

          {/* Common to BlogPosting / Article / NewsArticle */}
          {(['BlogPosting','Article','NewsArticle'] as SchemaType[]).includes(schemaType) && (
            <>
              <OverrideField label="Headline (overrides meta title)"   k="headline"       v={overrides} set={setOv} />
              <OverrideField label="Description (overrides meta desc)" k="description"    v={overrides} set={setOv} />
              <OverrideField label="Article Section (overrides category)" k="articleSection" v={overrides} set={setOv} />
              <OverrideField label="Keywords (overrides meta keywords)" k="keywords"       v={overrides} set={setOv} />
              <OverrideField label="Date Modified (ISO 8601)"           k="dateModified"   v={overrides} set={setOv} placeholder="2025-06-01T00:00:00Z" />
              <OverrideField label="Author Name"                        k="authorName"     v={overrides} set={setOv} />
              <OverrideField label="Author Role / Job Title"            k="authorRole"     v={overrides} set={setOv} />
            </>
          )}

          {/* FAQPage */}
          {schemaType === 'FAQPage' && (
            <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
              <p className="text-xs text-green-400 font-semibold mb-1">Auto-populated from FAQ blocks</p>
              <p className="text-xs text-[#9ca3af]">
                {blocks.filter(b => b.type === 'faq').length === 0
                  ? '⚠ No FAQ blocks found — add FAQ blocks in the Content tab.'
                  : `✓ Found ${blocks.filter(b => b.type === 'faq').flatMap(b => Array.isArray(b.items) ? b.items : []).length} FAQ items across ${blocks.filter(b => b.type === 'faq').length} block(s).`}
              </p>
            </div>
          )}

          {/* HowTo */}
          {schemaType === 'HowTo' && (
            <>
              <OverrideField label="How-To Name (overrides title)" k="howToName"      v={overrides} set={setOv} />
              <OverrideField label="Description"                   k="description"    v={overrides} set={setOv} />
              <OverrideField label="Total Time (ISO 8601 duration, e.g. PT30M)" k="totalTime" v={overrides} set={setOv} placeholder="PT30M" />
              <OverrideField label="Estimated Cost (INR, e.g. 499)"             k="estimatedCost" v={overrides} set={setOv} placeholder="0" />
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-400 font-semibold mb-1">Steps auto-populated from Steps blocks</p>
                <p className="text-xs text-[#9ca3af]">
                  {blocks.filter(b => b.type === 'steps').length === 0
                    ? '⚠ No Steps blocks found — add Steps blocks in the Content tab.'
                    : `✓ Found ${blocks.filter(b => b.type === 'steps').flatMap(b => Array.isArray(b.items) ? b.items : []).length} steps.`}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* JSON-LD Preview */}
      {schemaType !== 'none' && (
        <div className="admin-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d3e]">
            <button onClick={() => setShowJson(p => !p)}
              className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
              <Code2 className="w-4 h-4 text-[#6b7280]" />
              JSON-LD Output
              <ChevronDown className={clsx('w-4 h-4 text-[#6b7280] transition-transform', showJson && 'rotate-180')} />
            </button>
            <button onClick={copyJson}
              className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-white transition-colors">
              {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          {showJson && (
            <pre className="p-4 text-xs font-mono text-green-400 bg-[#0a0c14] overflow-x-auto leading-relaxed max-h-96">
              {jsonStr}
            </pre>
          )}
          {!showJson && (
            <div className="px-4 py-2.5 text-xs text-[#6b7280]">
              This will be injected as{' '}
              <code className="text-blue-400">{'<script type="application/ld+json">'}</code>{' '}
              on the post page.
            </div>
          )}
        </div>
      )}

      {/* Save schema to DB */}
      {schemaType !== 'none' && (
        <p className="text-xs text-[#6b7280]">
          💡 Schema is built dynamically on the page — no save needed. It always reflects current post data + FAQ/Steps blocks.
        </p>
      )}
    </div>
  )
}

function OverrideField({
  label, k, v, set, placeholder,
}: {
  label: string; k: string; v: Record<string,string>
  set: (k: string, val: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="admin-label mb-1 block">{label}</label>
      <input
        className="admin-input w-full"
        value={v[k] || ''}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder || 'Leave blank to auto-fill'}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BLOCK EDITOR — types + helpers
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCK_TYPES = [
  { type: 'heading',      icon: Type,          label: 'Heading',      color: 'text-purple-400' },
  { type: 'paragraph',    icon: FileText,       label: 'Paragraph',    color: 'text-blue-400'   },
  { type: 'list',         icon: List,           label: 'List',         color: 'text-green-400'  },
  { type: 'table',        icon: Table,          label: 'Table',        color: 'text-cyan-400'   },
  { type: 'tip',          icon: CheckSquare,    label: 'Tip',          color: 'text-amber-400'  },
  { type: 'warning',      icon: AlertTriangle,  label: 'Warning',      color: 'text-red-400'    },
  { type: 'image',        icon: ImageIcon,      label: 'Image',        color: 'text-pink-400'   },
  { type: 'quote',        icon: Quote,          label: 'Quote',        color: 'text-indigo-400' },
  { type: 'code',         icon: Code2,          label: 'Code',         color: 'text-green-300'  },
  { type: 'divider',      icon: Minus,          label: 'Divider',      color: 'text-gray-400'   },
  { type: 'cta',          icon: Megaphone,      label: 'CTA',          color: 'text-orange-400' },
  { type: 'faq',          icon: HelpCircle,     label: 'FAQ',          color: 'text-yellow-400' },
  { type: 'steps',        icon: Footprints,     label: 'Steps',        color: 'text-teal-400'   },
  { type: 'link',         icon: Link2,          label: 'Link',         color: 'text-blue-300'   },
  { type: 'service_card', icon: LayoutGrid,     label: 'Service Card', color: 'text-violet-400' },
  { type: 'pros_cons',    icon: BarChart3,      label: 'Pros / Cons',  color: 'text-emerald-400'},
  { type: 'comparison',   icon: Table,          label: 'Comparison',   color: 'text-rose-400'   },
] as const

function defaultBlock(type: string): Omit<Block, '_id'> {
  switch (type) {
    case 'heading':      return { type, level: 2, content: 'New Heading' }
    case 'paragraph':    return { type, content: 'Write your paragraph here…' }
    case 'list':         return { type, style: 'bullet', items: ['Item 1', 'Item 2'] }
    case 'table':        return { type, headers: ['Column 1', 'Column 2'], rows: [['Cell 1', 'Cell 2']] }
    case 'tip':          return { type, content: 'Your tip here.', label: 'Fiixup Tip' }
    case 'warning':      return { type, content: 'Your warning here.', label: 'Important' }
    case 'image':        return { type, url: '', alt: '', caption: '' }
    case 'quote':        return { type, content: 'Quote text here.', author: '' }
    case 'code':         return { type, language: 'javascript', content: '// code here' }
    case 'divider':      return { type }
    case 'cta':          return { type, heading: 'Book Doorstep Service', subtext: 'Fast, certified mechanics at your location.', buttonText: 'Book Now', buttonHref: '/contact' }
    case 'faq':          return { type, items: [{ question: 'Question here?', answer: 'Answer here.' }] }
    case 'steps':        return { type, items: [{ title: 'Step 1', description: 'Description.' }] }
    case 'link':         return { type, text: 'Link text', href: '/', external: false }
    case 'service_card': return { type, title: 'Service Name', description: 'Service description.', price: '₹499', href: '' }
    case 'pros_cons':    return { type, pros: ['Pro 1'], cons: ['Con 1'] }
    case 'comparison':   return { type, headers: ['Option A', 'Option B'], rows: [{ label: 'Feature', values: ['Value A', 'Value B'] }] }
    default:             return { type, content: '' }
  }
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function toBlocks(raw: unknown): Block[] {
  let arr: unknown[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === 'string') { try { arr = JSON.parse(raw) } catch { arr = [] } }
  return arr.map((b: any) => ({ ...b, _id: uid() }))
}

function stripIds(blocks: Block[]): Record<string, unknown>[] {
  return blocks.map(({ _id, ...rest }) => rest)
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function PostEditorPage() {
  const params   = useParams()
  const postSlug = String(params.slug)

  const [post,       setPost]       = useState<Record<string, unknown> | null>(null)
  const [tab,        setTab]        = useState<Tab>('SEO')
  const [loading,    setLoading]    = useState(true)
  const [blocks,     setBlocks]     = useState<Block[]>([])
  const [saving,     setSaving]     = useState(false)
  const [preview,    setPreview]    = useState(false)
  const [schemaType, setSchemaType] = useState<SchemaType>('BlogPosting')
  const [overrides,  setOverrides]  = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const sb = getBrowserClient()
    const { data } = await sb.from('posts').select('*').eq('slug', postSlug).single()
    if (data) {
      setPost(data)
      setBlocks(toBlocks(data.content))
      // Load saved schema type if present
      if (data.schema_type) setSchemaType(String(data.schema_type) as SchemaType)
      if (data.schema_overrides && typeof data.schema_overrides === 'object')
        setOverrides(data.schema_overrides as Record<string, string>)
    }
    setLoading(false)
  }, [postSlug])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  )
  if (!post) return <div className="text-red-400 p-8">Post not found: {postSlug}</div>

  // ── Helpers ────────────────────────────────────────────────────────────────
  const save = (col: string) => async (val: string) => {
    const result = await savePost(String(post.id), postSlug, { [col]: val })
    if (!result.success) return result
    setPost((p) => p ? { ...p, [col]: val } : p)
    showToast('success', result.message ?? 'Saved')
    return result
  }

  const saveBool = async (col: string, val: boolean) => {
    const result = await savePost(String(post.id), postSlug, { [col]: val })
    if (!result.success) { showToast('error', result.error); return }
    setPost((p) => p ? { ...p, [col]: val } : p)
    showToast('success', result.message ?? 'Saved')
  }

  const saveBlocks = async (bl: Block[]) => {
    setSaving(true)
    const result = await savePost(String(post.id), postSlug, { content: stripIds(bl) })
    setSaving(false)
    if (result.success) showToast('success', 'Content saved')
    else showToast('error', result.error ?? 'Save failed')
  }

  const saveSchema = async () => {
    const result = await savePost(String(post.id), postSlug, {
      schema_type:      schemaType,
      schema_overrides: overrides,
    })
    if (result.success) showToast('success', 'Schema saved')
    else showToast('error', result.error ?? 'Save failed')
  }

  const liveUrl = `https://fiixup.in/blog/${postSlug}`

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/posts" className="p-2 rounded-lg hover:bg-[#2a2d3e] transition-colors text-[#6b7280]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="admin-page-title flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {String(post.title ?? 'Untitled Post')}
            </h1>
            <p className="text-sm text-[#6b7280] mt-0.5">{postSlug} · {String(post.category ?? '—')}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData} className="admin-btn-secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
            <ExternalLink className="w-4 h-4" /> View Live
          </a>
        </div>
      </div>

      {/* ── Badges ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className={clsx('text-xs font-semibold px-3 py-1 rounded-full border',
          post.featured ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-[#2a2d3e] text-[#6b7280] border-[#2a2d3e]'
        )}>
          {post.featured ? '⭐ Featured' : 'Not Featured'}
        </span>
        <button onClick={() => saveBool('featured', !post.featured)} className="text-xs text-[#6b7280] hover:text-white underline">
          Toggle
        </button>
        {schemaType !== 'none' && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {schemaType}
          </span>
        )}
        <span className="text-xs text-[#6b7280] ml-auto">
          {blocks.length} block{blocks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === t ? 'tab-active' : 'tab-inactive'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SEO TAB
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'SEO' && (
        <div className="space-y-5">
          <div className="admin-card p-6 space-y-5">
            <h2 className="admin-section-title">SEO Meta</h2>

            {/* Meta title with counter */}
            <MetaField
              label="Meta Title"
              value={String(post.meta_title ?? '')}
              field="meta_title"
              onSave={save('meta_title')}
            />

            {/* Meta description with counter */}
            <MetaField
              label="Meta Description"
              value={String(post.meta_description ?? '')}
              field="meta_description"
              onSave={save('meta_description')}
              multiline rows={3}
            />

            <Field label="Meta Keywords"      value={String(post.meta_keywords ?? '')} onSave={save('meta_keywords')} multiline rows={2} />
            <Field label="Slug"               value={String(post.slug ?? '')}           onSave={save('slug')} />
            <Field label="Excerpt"            value={String(post.excerpt ?? '')}        onSave={save('excerpt')} multiline rows={3} />
          </div>

          {/* SERP preview */}
          <div className="admin-card p-5 space-y-3">
            <h2 className="admin-section-title">Google SERP Preview</h2>
            <SerpPreview
              title={String(post.meta_title ?? post.title ?? '')}
              description={String(post.meta_description ?? post.excerpt ?? '')}
              slug={postSlug}
            />
          </div>

          {/* OG image + WebP compressor */}
          <div className="admin-card p-5 space-y-4">
            <h2 className="admin-section-title">Cover / OG Image</h2>
            <Field label="Image URL"      value={String(post.image     ?? '')} onSave={save('image')} />
            <Field label="Image Alt Text" value={String(post.image_alt ?? '')} onSave={save('image_alt')} />
            {String(post.image ?? '') && (
              <div className="rounded-xl overflow-hidden border border-[#2a2d3e] bg-[#0f1117]">
                <img src={String(post.image)} alt="OG preview" className="max-h-48 w-full object-cover" />
              </div>
            )}
            <WebPCompressor />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SCHEMA TAB
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'Schema' && (
        <div className="space-y-5">
          <SchemaBuilder
            post={post}
            blocks={blocks}
            schemaType={schemaType}
            setSchemaType={setSchemaType}
            overrides={overrides}
            setOverrides={setOverrides}
          />
          <div className="flex justify-end">
            <button onClick={saveSchema} className="admin-btn-primary">
              Save Schema Settings
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          CONTENT TAB
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'Content' && (
        <div className="space-y-5">
          {/* Post info */}
          <div className="admin-card p-5 space-y-4">
            <h2 className="admin-section-title">Post Info</h2>
            <Field label="Title"       value={String(post.title       ?? '')} onSave={save('title')} />
            <Field label="Author"      value={String(post.author      ?? '')} onSave={save('author')} />
            <Field label="Author Role" value={String(post.author_role ?? '')} onSave={save('author_role')} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date (display, e.g. January 15, 2025)" value={String(post.date      ?? '')} onSave={save('date')} />
              <Field label="Read Time (e.g. 5 min read)"           value={String(post.read_time ?? '')} onSave={save('read_time')} />
            </div>
            <Field label="Category" value={String(post.category ?? '')} onSave={save('category')} />
          </div>

          {/* Block editor header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-[#e2e8f0]">Content Blocks</h2>
            <div className="flex gap-2">
              <button onClick={() => setPreview(p => !p)}
                className={clsx('admin-btn-secondary text-xs', preview && 'bg-blue-500/20 text-blue-400 border-blue-500/30')}>
                <Eye className="w-4 h-4" /> {preview ? 'Edit' : 'Preview JSON'}
              </button>
              <button onClick={() => saveBlocks(blocks)} disabled={saving} className="admin-btn-primary text-xs">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Content
              </button>
            </div>
          </div>

          {preview ? (
            <div className="admin-card p-4">
              <pre className="text-xs font-mono text-[#9ca3af] overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(stripIds(blocks), null, 2)}
              </pre>
            </div>
          ) : (
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          )}

          <div className="flex justify-end">
            <button onClick={() => saveBlocks(blocks)} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save All Content
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SETTINGS TAB
      ════════════════════════════════════════════════════════════════ */}
      {tab === 'Settings' && (
        <div className="admin-card p-6 space-y-5">
          <h2 className="admin-section-title">Post Settings</h2>

          {/* Featured toggle */}
          <div className="flex items-center justify-between p-4 bg-[#1a1d27] rounded-xl border border-[#2a2d3e]">
            <div>
              <p className="text-sm font-semibold text-[#e2e8f0]">Featured Post</p>
              <p className="text-xs text-[#6b7280] mt-0.5">Shown in featured sections across the site</p>
            </div>
            <button onClick={() => saveBool('featured', !post.featured)}
              className={clsx('relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                post.featured ? 'bg-blue-600' : 'bg-[#2a2d3e]')}>
              <span className={clsx('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                post.featured ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>

          <Field label="Related Service Slug"    value={String(post.related_service ?? '')} onSave={save('related_service')} />
          <Field label="Date ISO (for sorting)"  value={String(post.date_proper     ?? '')} onSave={save('date_proper')} />
          <Field label="Tags (comma separated)"
            value={Array.isArray(post.tags) ? (post.tags as string[]).join(', ') : String(post.tags ?? '')}
            onSave={async (val) => {
              const tags = val.split(',').map(t => t.trim()).filter(Boolean)
              return save('tags')(JSON.stringify(tags))
            }}
          />

          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="text-xs font-semibold text-red-400 mb-2">Danger Zone</p>
            <p className="text-xs text-[#6b7280]">
              To delete this post, use your Supabase dashboard. Deletion is disabled here to prevent accidents.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BLOCK EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

function BlockEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  const [showPicker, setShowPicker] = useState<number | null>(null)

  const addBlock = (type: string, afterIndex: number) => {
    const nb = { ...defaultBlock(type), _id: uid() } as Block
    const next = [...blocks]
    next.splice(afterIndex + 1, 0, nb)
    onChange(next)
    setShowPicker(null)
  }
  const updateBlock = (i: number, b: Block) => { const n = [...blocks]; n[i] = b; onChange(n) }
  const removeBlock = (i: number) => onChange(blocks.filter((_, idx) => idx !== i))
  const moveBlock   = (i: number, dir: -1|1) => {
    const n = [...blocks], t = i + dir
    if (t < 0 || t >= n.length) return
    ;[n[i], n[t]] = [n[t], n[i]]; onChange(n)
  }

  return (
    <div className="space-y-2">
      <AddBlockRow onAdd={(t) => addBlock(t, -1)} open={showPicker === -1} onToggle={() => setShowPicker(showPicker === -1 ? null : -1)} />
      {blocks.length === 0 && (
        <div className="admin-card p-10 text-center text-[#6b7280] text-sm">
          No blocks yet. Click <strong>+ Add Block</strong> above to start writing.
        </div>
      )}
      {blocks.map((block, i) => (
        <div key={block._id}>
          <BlockCard block={block} index={i} total={blocks.length}
            onUpdate={(b) => updateBlock(i, b)}
            onRemove={() => removeBlock(i)}
            onMove={(dir) => moveBlock(i, dir)} />
          <AddBlockRow onAdd={(t) => addBlock(t, i)} open={showPicker === i} onToggle={() => setShowPicker(showPicker === i ? null : i)} />
        </div>
      ))}
    </div>
  )
}

// ─── Add Block Row ────────────────────────────────────────────────────────────

function AddBlockRow({ onAdd, open, onToggle }: { onAdd: (t: string) => void; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 py-1">
        <button onClick={onToggle}
          className="flex items-center gap-1 text-xs text-[#6b7280] hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-[#2a2d3e]">
          <Plus className="w-3.5 h-3.5" /> Add Block
        </button>
        <div className="flex-1 h-px bg-[#2a2d3e]" />
      </div>
      {open && (
        <div className="absolute top-8 left-0 z-20 bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl shadow-xl p-3 w-72">
          <p className="text-xs text-[#6b7280] font-semibold uppercase tracking-wider mb-2 px-1">Choose block type</p>
          <div className="grid grid-cols-2 gap-1">
            {BLOCK_TYPES.map(({ type, icon: Icon, label, color }) => (
              <button key={type} onClick={() => onAdd(type)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2a2d3e] text-left transition-colors">
                <Icon className={clsx('w-4 h-4 shrink-0', color)} />
                <span className="text-xs text-[#e2e8f0]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({ block, index, total, onUpdate, onRemove, onMove }: {
  block: Block; index: number; total: number
  onUpdate: (b: Block) => void; onRemove: () => void; onMove: (dir: -1|1) => void
}) {
  const meta = BLOCK_TYPES.find(b => b.type === block.type)
  const Icon = meta?.icon ?? FileText
  return (
    <div className="admin-card border border-[#2a2d3e] hover:border-[#3a3d4e] transition-colors">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2a2d3e] bg-[#1a1d27] rounded-t-xl">
        <GripVertical className="w-4 h-4 text-[#6b7280] shrink-0" />
        <Icon className={clsx('w-4 h-4 shrink-0', meta?.color ?? 'text-gray-400')} />
        <span className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider flex-1">
          {meta?.label ?? block.type}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 rounded hover:bg-[#2a2d3e] text-[#6b7280] hover:text-white disabled:opacity-30 transition-colors">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove}
            className="p-1 rounded hover:bg-red-500/10 text-[#6b7280] hover:text-red-400 transition-colors ml-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <BlockFields block={block} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

// ─── Block Fields ─────────────────────────────────────────────────────────────

function BlockFields({ block, onUpdate }: { block: Block; onUpdate: (b: Block) => void }) {
  const set = (k: string, v: unknown) => onUpdate({ ...block, [k]: v })

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-3">
          <select value={String(block.level ?? 2)} onChange={(e) => set('level', +e.target.value)} className="admin-input w-24 text-sm">
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>H{n}</option>)}
          </select>
          <input className="admin-input w-full" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Heading text…" />
        </div>
      )
    case 'paragraph':
      return <textarea className="admin-textarea w-full min-h-[100px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Paragraph… (HTML allowed: <strong>, <em>, <a href=''>)" />
    case 'list':
      return (
        <div className="space-y-3">
          <select value={String(block.style ?? 'bullet')} onChange={(e) => set('style', e.target.value)} className="admin-input w-36 text-sm">
            <option value="bullet">Bullet list</option>
            <option value="numbered">Numbered list</option>
          </select>
          <ListItemsEditor items={Array.isArray(block.items) ? block.items.map(String) : []} onChange={(it) => set('items', it)} />
        </div>
      )
    case 'table':
      return <TableEditor block={block} onUpdate={onUpdate} />
    case 'tip':
    case 'warning':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.label ?? '')} onChange={(e) => set('label', e.target.value)} placeholder={block.type === 'tip' ? 'Label (e.g. Fiixup Tip)' : 'Label (e.g. Important)'} />
          <textarea className="admin-textarea w-full min-h-[80px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Content… (HTML allowed)" />
        </div>
      )
    case 'image':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.url ?? '')} onChange={(e) => set('url', e.target.value)} placeholder="Image URL (Supabase storage or CDN)" />
          <input className="admin-input w-full" value={String(block.alt ?? '')} onChange={(e) => set('alt', e.target.value)} placeholder="Alt text (required for SEO)" />
          <input className="admin-input w-full" value={String(block.caption ?? '')} onChange={(e) => set('caption', e.target.value)} placeholder="Caption (optional)" />
          {String(block.url ?? '') && (
            <div className="rounded-lg overflow-hidden border border-[#2a2d3e] bg-[#0f1117] p-2">
              <img src={String(block.url)} alt={String(block.alt ?? '')} className="max-h-40 object-contain rounded" />
            </div>
          )}
        </div>
      )
    case 'quote':
      return (
        <div className="space-y-3">
          <textarea className="admin-textarea w-full min-h-[80px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="Quote text…" />
          <input className="admin-input w-full" value={String(block.author ?? '')} onChange={(e) => set('author', e.target.value)} placeholder="Author (optional)" />
        </div>
      )
    case 'code':
      return (
        <div className="space-y-3">
          <input className="admin-input w-48" value={String(block.language ?? '')} onChange={(e) => set('language', e.target.value)} placeholder="Language (e.g. javascript)" />
          <textarea className="admin-textarea w-full font-mono text-xs min-h-[120px]" value={String(block.content ?? '')} onChange={(e) => set('content', e.target.value)} placeholder="// code…" spellCheck={false} />
        </div>
      )
    case 'divider':
      return <p className="text-xs text-[#6b7280] italic">Horizontal divider — no fields to edit.</p>
    case 'cta':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.heading ?? '')} onChange={(e) => set('heading', e.target.value)} placeholder="CTA heading" />
          <input className="admin-input w-full" value={String(block.subtext ?? '')} onChange={(e) => set('subtext', e.target.value)} placeholder="Subtext (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <input className="admin-input" value={String(block.buttonText ?? '')} onChange={(e) => set('buttonText', e.target.value)} placeholder="Button text" />
            <input className="admin-input" value={String(block.buttonHref ?? '')} onChange={(e) => set('buttonHref', e.target.value)} placeholder="/contact or tel:number" />
          </div>
        </div>
      )
    case 'faq':
      return <FaqEditor items={Array.isArray(block.items) ? block.items as any[] : []} onChange={(it) => set('items', it)} />
    case 'steps':
      return <StepsEditor items={Array.isArray(block.items) ? block.items as any[] : []} onChange={(it) => set('items', it)} />
    case 'link':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.text ?? '')} onChange={(e) => set('text', e.target.value)} placeholder="Link text" />
          <input className="admin-input w-full" value={String(block.href ?? '')} onChange={(e) => set('href', e.target.value)} placeholder="/page or https://…" />
          <label className="flex items-center gap-2 text-sm text-[#9ca3af] cursor-pointer">
            <input type="checkbox" checked={Boolean(block.external)} onChange={(e) => set('external', e.target.checked)} className="rounded" />
            Open in new tab
          </label>
        </div>
      )
    case 'service_card':
      return (
        <div className="space-y-3">
          <input className="admin-input w-full" value={String(block.title ?? '')} onChange={(e) => set('title', e.target.value)} placeholder="Service name" />
          <textarea className="admin-textarea w-full min-h-[70px]" value={String(block.description ?? '')} onChange={(e) => set('description', e.target.value)} placeholder="Short description" />
          <div className="grid grid-cols-2 gap-3">
            <input className="admin-input" value={String(block.price ?? '')} onChange={(e) => set('price', e.target.value)} placeholder="Starting price (₹499)" />
            <input className="admin-input" value={String(block.href ?? '')} onChange={(e) => set('href', e.target.value)} placeholder="Link URL (optional)" />
          </div>
        </div>
      )
    case 'pros_cons':
      return (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-green-400 mb-2">Pros</p>
            <ListItemsEditor items={Array.isArray(block.pros) ? block.pros.map(String) : []} onChange={(it) => set('pros', it)} placeholder="Add a pro…" />
          </div>
          <div>
            <p className="text-xs font-semibold text-red-400 mb-2">Cons</p>
            <ListItemsEditor items={Array.isArray(block.cons) ? block.cons.map(String) : []} onChange={(it) => set('cons', it)} placeholder="Add a con…" />
          </div>
        </div>
      )
    case 'comparison':
      return <ComparisonEditor block={block} onUpdate={onUpdate} />
    default:
      return <p className="text-xs text-[#6b7280] italic">Unknown block type: <code className="text-blue-400">{block.type}</code></p>
  }
}

// ─── Sub-editors ──────────────────────────────────────────────────────────────

function ListItemsEditor({ items, onChange, placeholder = 'Add item…' }: { items: string[]; onChange: (it: string[]) => void; placeholder?: string }) {
  const upd = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n) }
  const rem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input className="admin-input flex-1 text-sm" value={item} onChange={(e) => upd(i, e.target.value)} placeholder={placeholder} />
          <button onClick={() => rem(i)} className="p-1.5 rounded hover:bg-red-500/10 text-[#6b7280] hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add item</button>
    </div>
  )
}

function FaqEditor({ items, onChange }: { items: { question: string; answer: string }[]; onChange: (it: any[]) => void }) {
  const upd = (i: number, k: string, v: string) => { const n = items.map(x => ({...x})); n[i] = {...n[i], [k]: v}; onChange(n) }
  const rem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="bg-[#1a1d27] rounded-xl p-4 space-y-2 border border-[#2a2d3e]">
          <div className="flex justify-between"><span className="text-xs text-[#6b7280] font-semibold">Q{i+1}</span>
            <button onClick={() => rem(i)} className="text-[#6b7280] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></div>
          <input className="admin-input w-full text-sm" value={item.question} onChange={(e) => upd(i, 'question', e.target.value)} placeholder="Question?" />
          <textarea className="admin-textarea w-full min-h-[70px] text-sm" value={item.answer} onChange={(e) => upd(i, 'answer', e.target.value)} placeholder="Answer… (HTML allowed)" />
        </div>
      ))}
      <button onClick={() => onChange([...items, { question: '', answer: '' }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add FAQ item</button>
    </div>
  )
}

function StepsEditor({ items, onChange }: { items: { title: string; description: string }[]; onChange: (it: any[]) => void }) {
  const upd = (i: number, k: string, v: string) => { const n = items.map(x => ({...x})); n[i] = {...n[i], [k]: v}; onChange(n) }
  const rem = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3">
          <div className="shrink-0 w-7 h-7 bg-[#2a2d3e] rounded-full flex items-center justify-center text-xs font-bold text-[#9ca3af] mt-2">{i+1}</div>
          <div className="flex-1 space-y-2">
            <input className="admin-input w-full text-sm" value={item.title} onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Step title" />
            <textarea className="admin-textarea w-full text-sm min-h-[60px]" value={item.description} onChange={(e) => upd(i, 'description', e.target.value)} placeholder="Step description" />
          </div>
          <button onClick={() => rem(i)} className="shrink-0 mt-2 text-[#6b7280] hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, { title: '', description: '' }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add step</button>
    </div>
  )
}

function TableEditor({ block, onUpdate }: { block: Block; onUpdate: (b: Block) => void }) {
  const headers = Array.isArray(block.headers) ? block.headers.map(String) : ['Column 1']
  const rows    = Array.isArray(block.rows)    ? (block.rows as unknown[][]).map(r => Array.isArray(r) ? r.map(String) : []) : [['']]
  const setH = (h: string[]) => onUpdate({ ...block, headers: h })
  const setR = (r: string[][]) => onUpdate({ ...block, rows: r })
  const updH = (i: number, v: string) => { const h = [...headers]; h[i] = v; setH(h) }
  const addCol = () => { setH([...headers, `Col ${headers.length+1}`]); setR(rows.map(r => [...r, ''])) }
  const remCol = (i: number) => { setH(headers.filter((_,ci) => ci !== i)); setR(rows.map(r => r.filter((_,ci) => ci !== i))) }
  const updC = (ri: number, ci: number, v: string) => { const r = rows.map(row => [...row]); r[ri][ci] = v; setR(r) }
  const addRow = () => setR([...rows, Array(headers.length).fill('')])
  const remRow = (i: number) => setR(rows.filter((_,ri) => ri !== i))
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex gap-2 items-center">
        <button onClick={addCol} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Col</button>
        <button onClick={addRow} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Row</button>
        <input className="admin-input text-xs flex-1 max-w-xs" value={String(block.caption ?? '')} onChange={(e) => onUpdate({...block, caption: e.target.value})} placeholder="Caption (optional)" />
      </div>
      <table className="text-xs border-collapse">
        <thead><tr>
          {headers.map((h, i) => (
            <th key={i} className="border border-[#2a2d3e] p-1">
              <div className="flex gap-1">
                <input className="admin-input text-xs w-24 font-semibold" value={h} onChange={(e) => updH(i, e.target.value)} />
                <button onClick={() => remCol(i)} className="text-[#6b7280] hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
              </div>
            </th>
          ))}
          <th className="border border-[#2a2d3e] p-1 w-8"/>
        </tr></thead>
        <tbody>{rows.map((row, ri) => (
          <tr key={ri}>{row.map((cell, ci) => (
            <td key={ci} className="border border-[#2a2d3e] p-1">
              <input className="admin-input text-xs w-24" value={cell} onChange={(e) => updC(ri, ci, e.target.value)} />
            </td>
          ))}
          <td className="border border-[#2a2d3e] p-1">
            <button onClick={() => remRow(ri)} className="text-[#6b7280] hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
          </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function ComparisonEditor({ block, onUpdate }: { block: Block; onUpdate: (b: Block) => void }) {
  const headers = Array.isArray(block.headers) ? block.headers.map(String) : []
  const rows    = Array.isArray(block.rows) ? block.rows as { label: string; values: string[] }[] : []
  const set = (k: string, v: unknown) => onUpdate({ ...block, [k]: v })
  const updH = (i: number, v: string) => { const h = [...headers]; h[i] = v; set('headers', h) }
  const updV = (ri: number, vi: number, v: string) => {
    const r = rows.map(row => ({ ...row, values: [...(row.values ?? [])] }))
    r[ri].values[vi] = v; set('rows', r)
  }
  const updLabel = (ri: number, v: string) => { const r = rows.map(row => ({...row})); r[ri].label = v; set('rows', r) }
  const remRow = (i: number) => set('rows', rows.filter((_, ri) => ri !== i))
  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex gap-2 flex-wrap items-center">
        <p className="text-xs text-[#6b7280] font-semibold">Headers:</p>
        {headers.map((h, i) => (
          <input key={i} className="admin-input text-xs w-28" value={h} onChange={(e) => updH(i, e.target.value)} />
        ))}
        <button onClick={() => set('headers', [...headers, `Option ${headers.length+1}`])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Header</button>
      </div>
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-2 items-center">
            <input className="admin-input text-xs w-32 shrink-0" value={row.label} onChange={(e) => updLabel(ri, e.target.value)} placeholder="Feature" />
            {(row.values ?? []).map((v, vi) => (
              <input key={vi} className="admin-input text-xs w-24" value={v} onChange={(e) => updV(ri, vi, e.target.value)} placeholder="✓ / ✗ / text" />
            ))}
            <button onClick={() => remRow(ri)} className="text-[#6b7280] hover:text-red-400 shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        ))}
        <button onClick={() => set('rows', [...rows, { label: 'Feature', values: Array(headers.length).fill('') }])} className="text-xs text-blue-400 flex items-center gap-1"><Plus className="w-3 h-3"/>Add row</button>
      </div>
    </div>
  )
}
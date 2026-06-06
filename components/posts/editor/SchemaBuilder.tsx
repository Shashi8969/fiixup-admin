'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, Check, ChevronDown, Code2, Copy } from 'lucide-react'
import type { Block, SchemaType } from '@/components/posts/editor/types'
import { buildJsonLd } from '@/utils/posts/schema'

const SCHEMA_OPTIONS: { value: SchemaType; label: string; desc: string; badge: string }[] = [
  { value: 'none',        label: 'None',        desc: 'No structured data',                        badge: 'bg-[#2a2d3e] text-[#6b7280]'       },
  { value: 'BlogPosting', label: 'BlogPosting',  desc: 'Guides, how-tos, editorial posts',          badge: 'bg-blue-500/10 text-blue-400'       },
  { value: 'Article',     label: 'Article',      desc: 'Generic editorial / informational content', badge: 'bg-purple-500/10 text-purple-400'   },
  { value: 'NewsArticle', label: 'NewsArticle',  desc: 'Breaking news, time-sensitive posts',       badge: 'bg-red-500/10 text-red-400'         },
  { value: 'FAQPage',     label: 'FAQPage',      desc: 'Unlocks FAQ rich results in Google',        badge: 'bg-green-500/10 text-green-400'     },
  { value: 'HowTo',       label: 'HowTo',        desc: 'Step-by-step guides with rich results',     badge: 'bg-amber-500/10 text-amber-400'     },
]

export function SchemaBuilder({
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

  const hasFaq   = blocks.some((b) => b.type === 'faq')
  const hasSteps = blocks.some((b) => b.type === 'steps')
  const recommended: SchemaType = hasSteps ? 'HowTo' : hasFaq ? 'FAQPage' : 'BlogPosting'

  return (
    <div className="space-y-5">
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

      {schemaType !== 'none' && (
        <div className="admin-card p-5 space-y-4">
          <p className="admin-section-title">
            Overrides
            <span className="ml-2 text-xs text-[#6b7280] font-normal normal-case">
              — leave blank to auto-fill from post data
            </span>
          </p>

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

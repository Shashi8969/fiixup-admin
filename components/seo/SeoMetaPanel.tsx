'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Search, Smartphone, Monitor } from 'lucide-react'
import { Field } from '@/components/ui/Field'
import type { ActionResult } from '@/lib/actions'
import {
  META_LIMITS,
  countWords,
  getMetaMessage,
  getMetaStatus,
  normalizeDisplayUrl,
  truncateForGoogle,
  type MetaFieldType,
} from '@/utils/seo/metaMetrics'

type SaveFn = (value: string) => Promise<ActionResult>

export function SeoMetaPanel({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImageUrl,
  urlPath,
  onSaveTitle,
  onSaveDescription,
  onSaveKeywords,
  onSaveCanonicalUrl,
  onSaveOgImageUrl,
  extraFields,
}: {
  title: string
  description: string
  keywords?: string

  canonicalUrl?: string
  ogImageUrl?: string

  urlPath: string

  onSaveTitle: SaveFn
  onSaveDescription: SaveFn
  onSaveKeywords?: SaveFn

  onSaveCanonicalUrl?: SaveFn
  onSaveOgImageUrl?: SaveFn

  extraFields?: React.ReactNode
}) {
  const [liveTitle, setLiveTitle] = useState(title)
  const [liveDesc, setLiveDesc] = useState(description)

  useEffect(() => setLiveTitle(title), [title])
  useEffect(() => setLiveDesc(description), [description])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <div className="admin-card p-5 space-y-4">
          <div>
            <Field
              label="Meta Title"
              value={liveTitle}
              onSave={async (value) => {
                setLiveTitle(value)
                return onSaveTitle(value)
              }}
            />
            <MetaCount value={liveTitle} type="title" />
          </div>

          <div>
            <Field
              label="Meta Description"
              value={liveDesc}
              multiline
              rows={3}
              onSave={async (value) => {
                setLiveDesc(value)
                return onSaveDescription(value)
              }}
            />
            <MetaCount value={liveDesc} type="description" />
          </div>

          {onSaveKeywords && (
            <Field
              label="Meta Keywords"
              value={keywords ?? ''}
              multiline
              rows={2}
              onSave={onSaveKeywords}
            />
          )}
          {canonicalUrl !== undefined && onSaveCanonicalUrl && (
  <Field
    label="Canonical URL"
    value={canonicalUrl}
    onSave={onSaveCanonicalUrl}
  />
)}
{ogImageUrl !== undefined && onSaveOgImageUrl && (
  <Field
    label="OG Image URL"
    value={ogImageUrl}
    onSave={onSaveOgImageUrl}
  />
)}

          {extraFields}
        </div>

        <SerpPreviewCard title={liveTitle} description={liveDesc} urlPath={urlPath} />
      </div>
    </div>
  )
}

export function MetaCount({ value, type }: { value: string; type: MetaFieldType }) {
  const status = getMetaStatus(value, type)
  const limit = META_LIMITS[type]
  const length = value.length
  const words = countWords(value)
  const pct = Math.min((length / limit.max) * 100, 100)

  const statusClass: Record<typeof status, string> = {
    empty: 'text-[#6b7280]',
    short: 'text-amber-400',
    good: 'text-green-400',
    warning: 'text-amber-400',
    over: 'text-red-400',
  }

  const barClass: Record<typeof status, string> = {
    empty: 'bg-[#2a2d3e]',
    short: 'bg-amber-400',
    good: 'bg-green-400',
    warning: 'bg-amber-400',
    over: 'bg-red-500',
  }

  return (
    <div className="mt-2 rounded-lg border border-[#2a2d3e] bg-[#0f1117] p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className={clsx('text-xs font-semibold', statusClass[status])}>{getMetaMessage(value, type)}</p>
        <p className="text-xs text-[#9ca3af] tabular-nums">
          <span className={statusClass[status]}>{length}</span> chars · {words} words · ideal {limit.idealMin}-{limit.idealMax}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-[#2a2d3e] overflow-hidden mt-2">
        <div className={clsx('h-full rounded-full transition-all duration-200', barClass[status])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SerpPreviewCard({ title, description, urlPath }: { title: string; description: string; urlPath: string }) {
  const previewTitle = truncateForGoogle(title || 'Your SEO title will appear here', 'title')
  const previewDesc = truncateForGoogle(description || 'Your meta description preview will appear here. Keep it useful, local, and click-worthy without keyword stuffing.', 'description')
  const displayUrl = normalizeDisplayUrl(urlPath)

  return (
    <div className="admin-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="admin-section-title flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" /> Google Preview
          </h3>
          <p className="text-xs text-[#6b7280] mt-1">Desktop + mobile style preview before publishing.</p>
        </div>
        <div className="flex items-center gap-2 text-[#6b7280]">
          <Monitor className="w-4 h-4" />
          <Smartphone className="w-4 h-4" />
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 border border-gray-200 shadow-sm">
        <p className="text-xs leading-5" style={{ color: '#4d5156', fontFamily: 'Arial, sans-serif' }}>{displayUrl}</p>
        <p className="text-[18px] leading-snug line-clamp-1" style={{ color: '#1a0dab', fontFamily: 'Arial, sans-serif' }}>{previewTitle}</p>
        <p className="text-sm leading-relaxed mt-1 line-clamp-2" style={{ color: '#4d5156', fontFamily: 'Arial, sans-serif' }}>{previewDesc}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-3">
  <h4 className="text-xs font-semibold text-[#9ca3af] mb-2">
    SEO Checklist
  </h4>

  <ul className="space-y-1 text-xs">
    <li className={title.length >= 50 && title.length <= 60
      ? 'text-green-400'
      : 'text-amber-400'}>
      ✓ Title length
    </li>

    <li className={description.length >= 140 && description.length <= 155
      ? 'text-green-400'
      : 'text-amber-400'}>
      ✓ Description length
    </li>

    <li className={title.length > 0
      ? 'text-green-400'
      : 'text-red-400'}>
      ✓ Meta title present
    </li>

    <li className={description.length > 0
      ? 'text-green-400'
      : 'text-red-400'}>
      ✓ Meta description present
    </li>
  </ul>
</div>
        <PreviewMetric label="Title" value={`${title.length}/60`} ok={title.length >= 50 && title.length <= 60} />
        <PreviewMetric label="Description" value={`${description.length}/155`} ok={description.length >= 140 && description.length <= 155} />
      </div>
    </div>
  )
}

function PreviewMetric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-3 text-center">
      <p className={clsx('text-sm font-bold', ok ? 'text-green-400' : 'text-amber-400')}>{value}</p>
      <p className="text-xs text-[#6b7280] mt-1">{label}</p>
    </div>
  )
}

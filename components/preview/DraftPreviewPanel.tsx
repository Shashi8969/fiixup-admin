'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { ExternalLink, Loader2, Monitor, RefreshCw, Rocket, Smartphone } from 'lucide-react'
import { clsx } from 'clsx'
import { publishPreviewDraft, upsertPreviewDraft } from '@/lib/preview-drafts'
import { showToast } from '@/components/ui/Toast'

type Device = 'desktop' | 'mobile'

type Props = {
  title?: string
  contentType: 'post' | 'city' | 'service' | 'city_service_page' | 'location_service'
  sourceTable: string
  sourceId: string
  sourceSlug?: string | null
  publicPath: string
  payload: Record<string, unknown>
  imageSettings?: Record<string, unknown>
  onPublished?: () => void
}

const MAIN_SITE = (process.env.NEXT_PUBLIC_FIIXUP_SITE_URL || 'https://fiixup.in').replace(/\/+$/, '')

export function DraftPreviewPanel({
  title = 'Draft Preview',
  contentType,
  sourceTable,
  sourceId,
  sourceSlug,
  publicPath,
  payload,
  imageSettings,
  onPublished,
}: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(Date.now())
  const [device, setDevice] = useState<Device>('desktop')
  const [syncing, startSync] = useTransition()
  const [publishing, startPublish] = useTransition()

  const serialized = useMemo(
    () => JSON.stringify({ payload, imageSettings }),
    [payload, imageSettings]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      startSync(async () => {
        const result = await upsertPreviewDraft({
          token,
          contentType,
          sourceTable,
          sourceId,
          sourceSlug,
          publicPath,
          payload,
          imageSettings,
        })

        if (result.success && result.token) {
          setToken(result.token)
        }
      })
    }, 700)

    return () => window.clearTimeout(timer)
  }, [serialized, contentType, sourceTable, sourceId, sourceSlug, publicPath, token, payload, imageSettings])

  const previewUrl = token
    ? MAIN_SITE + '/admin-preview/' + token + '?r=' + refreshKey
    : ''

  const publish = () => {
    if (!token) {
      showToast('error', 'Preview is still syncing. Wait a moment.')
      return
    }

    if (!confirm('Publish this preview draft to the live database?')) return

    startPublish(async () => {
      const result = await publishPreviewDraft(token)

      if (result.success) {
        showToast('success', result.message ?? 'Published')
        onPublished?.()
      } else {
        showToast('error', result.error ?? 'Publish failed')
      }
    })
  }

  return (
    <section className="admin-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 flex-wrap p-4 border-b border-[#2a2d3e] bg-[#1a1d27]">
        <div>
          <h2 className="text-sm font-semibold text-[#e2e8f0]">{title}</h2>
          <p className="text-xs text-[#6b7280] mt-1">
            Unsaved changes auto-sync to preview_drafts. Live database updates only when you click Publish Draft.
          </p>
          <p className="text-[11px] text-[#6b7280] mt-1">
            {syncing ? 'Syncing draft…' : token ? 'Draft token: ' + token : 'Creating draft…'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-1">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                device === 'desktop' ? 'bg-blue-600 text-white' : 'text-[#94a3b8] hover:bg-[#2a2d3e]'
              )}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </button>

            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                device === 'mobile' ? 'bg-blue-600 text-white' : 'text-[#94a3b8] hover:bg-[#2a2d3e]'
              )}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </button>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey(Date.now())}
            className="admin-btn-secondary text-xs"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn-secondary text-xs"
            >
              <ExternalLink className="h-4 w-4" /> Open
            </a>
          )}

          <button
            type="button"
            onClick={publish}
            disabled={publishing || !token}
            className="admin-btn-primary text-xs"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publish Draft
          </button>
        </div>
      </div>

      <div className="overflow-auto bg-[#0b0d12] p-3 sm:p-5">
        <div
          className="mx-auto overflow-hidden rounded-2xl border border-[#2a2d3e] bg-white shadow-2xl"
          style={{ width: device === 'mobile' ? 390 : '100%', maxWidth: '100%' }}
        >
          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Draft preview"
              className="h-[780px] w-full bg-white"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
            />
          ) : (
            <div className="h-[420px] flex items-center justify-center text-gray-500">
              Creating preview…
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ExternalLink, Monitor, RefreshCw, Smartphone } from 'lucide-react'

type PreviewDevice = 'desktop' | 'mobile'

type LivePagePreviewProps = {
  title: string
  url: string
  description?: string
  defaultDevice?: PreviewDevice
  className?: string
}

const DEVICES: Record<PreviewDevice, { label: string; width: string; icon: typeof Monitor }> = {
  desktop: { label: 'Desktop', width: '100%', icon: Monitor },
  mobile:  { label: 'Mobile',  width: '390px', icon: Smartphone },
}

function withPreviewCacheBuster(url: string, refreshKey: number) {
  try {
    const nextUrl = new URL(url)
    nextUrl.searchParams.set('admin_preview', String(refreshKey))
    return nextUrl.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}admin_preview=${refreshKey}`
  }
}

export function LivePagePreview({
  title,
  url,
  description = 'This preview loads the real Fiixup frontend page inside the admin panel.',
  defaultDevice = 'desktop',
  className,
}: LivePagePreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>(defaultDevice)
  const [refreshKey, setRefreshKey] = useState(() => Date.now())

  const iframeUrl = useMemo(() => withPreviewCacheBuster(url, refreshKey), [url, refreshKey])
  const activeDevice = DEVICES[device]

  return (
    <section className={clsx('admin-card overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4 flex-wrap p-4 border-b border-[#2a2d3e] bg-[#1a1d27]">
        <div>
          <h2 className="text-sm font-semibold text-[#e2e8f0]">{title}</h2>
          <p className="text-xs text-[#6b7280] mt-1 max-w-2xl">{description}</p>
          <p className="text-[11px] text-[#6b7280] mt-1 break-all">{url}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-1">
            {(Object.keys(DEVICES) as PreviewDevice[]).map((key) => {
              const Icon = DEVICES[key].icon
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    device === key
                      ? 'bg-blue-600 text-white'
                      : 'text-[#94a3b8] hover:bg-[#2a2d3e] hover:text-white'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {DEVICES[key].label}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey(Date.now())}
            className="admin-btn-secondary text-xs"
          >
            <RefreshCw className="h-4 w-4" /> Reload
          </button>

          <a href={url} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary text-xs">
            <ExternalLink className="h-4 w-4" /> Open
          </a>
        </div>
      </div>

      <div className="overflow-auto bg-[#0b0d12] p-3 sm:p-5">
        <div
          className={clsx(
            'mx-auto overflow-hidden rounded-2xl border border-[#2a2d3e] bg-white shadow-2xl transition-all duration-200',
            device === 'mobile' && 'min-h-[760px]'
          )}
          style={{ width: activeDevice.width, maxWidth: '100%' }}
        >
          <iframe
            key={iframeUrl}
            src={iframeUrl}
            title={title}
            className="h-[760px] w-full bg-white"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  )
}

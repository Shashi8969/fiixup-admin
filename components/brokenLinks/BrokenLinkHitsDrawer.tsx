'use client'

import { useEffect, useState } from 'react'
import { Globe, Loader2, X } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { listBrokenLinkHits } from '@/lib/actions'
import type { BrokenLinkHitRecord } from './types'

interface BrokenLinkHitsDrawerProps {
  path: string
  onClose: () => void
}

export function BrokenLinkHitsDrawer({ path, onClose }: BrokenLinkHitsDrawerProps) {
  const [hits, setHits] = useState<BrokenLinkHitRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listBrokenLinkHits(path)
      if (cancelled) return
      setLoading(false)
      if (!result.success) {
        showToast('error', result.error)
        return
      }
      setHits(result.rows)
    })()
    return () => { cancelled = true }
  }, [path])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="admin-card flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2a2d3e] px-5 py-4">
          <div className="min-w-0">
            <h2 className="admin-section-title flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              Hit history
            </h2>
            <p className="mt-0.5 truncate text-xs text-[#6b7280]">{path}</p>
          </div>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : hits.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#94a3b8]">No hit records found.</p>
          ) : (
            <div className="space-y-2">
              {hits.map((hit) => (
                <div key={hit.id} className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-semibold text-blue-300">
                      {hit.ip_address || 'Unknown IP'}
                    </span>
                    <span className="text-[#6b7280]">{new Date(hit.created_at).toLocaleString()}</span>
                  </div>
                  {hit.referrer && (
                    <p className="mt-1.5 truncate text-xs text-[#94a3b8]">
                      <span className="text-[#6b7280]">From:</span> {hit.referrer}
                    </p>
                  )}
                  {hit.user_agent && (
                    <p className="mt-1 truncate text-[11px] text-[#475569]">{hit.user_agent}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

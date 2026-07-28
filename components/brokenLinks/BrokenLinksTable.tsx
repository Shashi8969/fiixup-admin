'use client'

import { CheckCircle2, Clock, ExternalLink, Eye, Loader2, Redo2, RouteOff, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { BrokenLinkRecord } from './types'

interface BrokenLinksTableProps {
  rows: BrokenLinkRecord[]
  loading: boolean
  suggestionsByPath: Record<string, string[]>
  onCreateRedirect: (row: BrokenLinkRecord, destination: string) => void
  onResolve: (row: BrokenLinkRecord) => void
  onReopen: (row: BrokenLinkRecord) => void
  onDelete: (row: BrokenLinkRecord) => void
  onViewHits: (row: BrokenLinkRecord) => void
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function BrokenLinksTable({
  rows, loading, suggestionsByPath,
  onCreateRedirect, onResolve, onReopen, onDelete, onViewHits,
}: BrokenLinksTableProps) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="admin-card p-8 text-center">
        <RouteOff className="mx-auto mb-3 h-8 w-8 text-[#4b5563]" />
        <p className="text-sm text-[#94a3b8]">No broken links detected.</p>
        <p className="mt-1 text-xs text-[#6b7280]">
          When a visitor hits a real 404 on the live site, it&apos;ll show up here automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const suggestions = suggestionsByPath[row.path] ?? []
        return (
          <div key={row.path} className="admin-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-mono text-sm font-semibold text-[#e2e8f0]">{row.path}</p>
                  {row.is_resolved ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-300">
                      <CheckCircle2 className="h-3 w-3" /> Resolved
                    </span>
                  ) : (
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                      Open
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                  <span className="font-semibold text-[#94a3b8]">{row.hit_count} hit{row.hit_count === 1 ? '' : 's'}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> first {timeAgo(row.first_seen_at)}</span>
                  <span>last {timeAgo(row.last_seen_at)}</span>
                </div>
              </div>

              <div className="flex flex-shrink-0 gap-1.5">
                <button onClick={() => onViewHits(row)} className="admin-btn-secondary" title="View hit history (IPs, referrers)">
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {row.is_resolved ? (
                  <button onClick={() => onReopen(row)} className="admin-btn-secondary" title="Reopen">
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button onClick={() => onDelete(row)} className="admin-btn-danger" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!row.is_resolved && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#2a2d3e] pt-3">
                <span className="text-xs text-[#6b7280]">Redirect to:</span>
                {suggestions.map((dest) => (
                  <button
                    key={dest}
                    onClick={() => onCreateRedirect(row, dest)}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                    )}
                  >
                    <ExternalLink className="h-3 w-3" />
                    {dest}
                  </button>
                ))}
                <button
                  onClick={() => onCreateRedirect(row, '')}
                  className="text-xs font-medium text-[#6b7280] hover:text-white"
                >
                  Choose a different URL…
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

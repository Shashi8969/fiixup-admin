'use client'

import { Edit3, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { RedirectStatusBadge } from './RedirectStatusBadge'
import type { RedirectRecord } from './types'

interface RedirectsTableProps {
  redirects: RedirectRecord[]
  loading: boolean
  onEdit: (redirect: RedirectRecord) => void
  onDelete: (redirect: RedirectRecord) => void
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function RedirectsTable({ redirects, loading, onEdit, onDelete }: RedirectsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (redirects.length === 0) {
    return (
      <div className="admin-card text-center py-16 text-[#6b7280]">
        <ExternalLink className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No redirects found.</p>
        <p className="text-xs mt-1">Add your first redirect to manage old URLs.</p>
      </div>
    )
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#111827] border-b border-[#2a2d3e]">
            <tr className="text-left text-xs uppercase tracking-wider text-[#94a3b8]">
              <th className="px-4 py-3 font-semibold">Source</th>
              <th className="px-4 py-3 font-semibold">Destination</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2d3e]">
            {redirects.map(redirect => (
              <tr key={redirect.id} className="hover:bg-[#1e2133] transition-colors">
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-white break-all">{redirect.source}</p>
                  {redirect.note && <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">{redirect.note}</p>}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-blue-300 break-all">{redirect.destination}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
                    {redirect.is_permanent ?? true ? '301' : '302'}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <RedirectStatusBadge active={redirect.is_active ?? true} />
                </td>
                <td className="px-4 py-3 align-top text-[#94a3b8] text-xs whitespace-nowrap">
                  {formatDate(redirect.updated_at ?? redirect.created_at)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => onEdit(redirect)} className="admin-btn-secondary px-2.5 py-1.5 text-xs">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => onDelete(redirect)} className="admin-btn-danger">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

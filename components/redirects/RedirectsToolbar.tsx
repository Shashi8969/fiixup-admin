'use client'

import { Plus, RefreshCw, Search } from 'lucide-react'

interface RedirectsToolbarProps {
  search: string
  onSearch: (value: string) => void
  onRefresh: () => void
  onCreate: () => void
  total: number
}

export function RedirectsToolbar({ search, onSearch, onRefresh, onCreate, total }: RedirectsToolbarProps) {
  return (
    <div className="admin-card p-4 flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search source, destination or note…"
          className="admin-input pl-9"
        />
      </div>
      <span className="text-xs text-[#6b7280] whitespace-nowrap">{total} redirects</span>
      <button onClick={onRefresh} className="admin-btn-secondary">
        <RefreshCw className="w-4 h-4" /> Refresh
      </button>
      <button onClick={onCreate} className="admin-btn-primary">
        <Plus className="w-4 h-4" /> Add Redirect
      </button>
    </div>
  )
}

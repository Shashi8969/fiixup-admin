'use client'
// app/(admin)/global-service-pages/page.tsx
// List view for global_service_pages — national / city-targeted-by-name pages
// like /bangalore-towing-service that don't live under a city URL segment.

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { getBrowserClient }    from '@/lib/supabase'
import { Globe, Search, ArrowRight } from 'lucide-react'

export default function GlobalServicePagesList() {
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const sb = getBrowserClient()
      const { data } = await sb
        .from('global_service_pages')
        .select('id, service_slug, service_name, canonical_url, is_active, updated_at')
        .order('service_name')
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter((r) =>
    !search ||
    String(r.service_name).toLowerCase().includes(search.toLowerCase()) ||
    String(r.service_slug).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <Globe className="w-6 h-6 text-blue-400" />
          Global Service Pages
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">
          Standalone national/city-named pages (e.g. /bangalore-towing-service) — content, FAQs, pricing and schema.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pages…"
          className="admin-input pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center text-[#6b7280] py-16">Loading…</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#6b7280] text-sm italic">No pages found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <Link
              key={String(row.id)}
              href={`/global-service-pages/${row.id}`}
              className="admin-card flex items-center gap-3 px-4 py-3 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors truncate">
                  {String(row.service_name)}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5 truncate">
                  /{String(row.service_slug)}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                row.is_active
                  ? 'text-green-400 bg-green-400/10 border-green-400/20'
                  : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
              }`}>
                {row.is_active ? 'Active' : 'Inactive'}
              </span>
              <ArrowRight className="w-4 h-4 text-[#6b7280] group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

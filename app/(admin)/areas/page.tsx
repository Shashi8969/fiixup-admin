'use client'
// app/(admin)/areas/page.tsx
// Mirrors app/(admin)/location-services/page.tsx's city-filtered list pattern.

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { getBrowserClient }    from '@/lib/supabase'
import { Building2, Search, ArrowRight } from 'lucide-react'

export default function AreasPage() {
  const [rows,    setRows]    = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [city,    setCity]    = useState('bangalore')

  const CITIES = ['bangalore', 'mumbai', 'chennai', 'hyderabad']

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const sb = getBrowserClient()
      const { data } = await sb
        .from('areas')
        .select('id, name, slug, city_slug, is_active, vehicles_serviced, sort_order')
        .eq('city_slug', city)
        .order('sort_order')
      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [city])

  const filtered = rows.filter((r) =>
    !search ||
    String(r.name).toLowerCase().includes(search.toLowerCase()) ||
    String(r.slug).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <Building2 className="w-6 h-6 text-purple-400" />
          Areas
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">
          Edit hero copy, local insight, SEO content and schema for each area page. New areas are added from a
          city&apos;s editor (Cities → a city → Areas tab).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                city === c ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search areas…"
            className="admin-input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-[#6b7280] py-16">Loading…</div>
      ) : filtered.length === 0 ? (
        <p className="text-[#6b7280] text-sm italic">No areas found for {city}.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <Link
              key={String(row.id)}
              href={`/areas/${row.id}`}
              className="admin-card flex items-center gap-3 px-4 py-3 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors truncate">
                  {String(row.name)}
                </p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  /{String(row.city_slug)}/{String(row.slug)}
                  {row.vehicles_serviced ? ` · ${row.vehicles_serviced} vehicles serviced` : ''}
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

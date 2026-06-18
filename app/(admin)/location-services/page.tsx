'use client'
// app/(admin)/location-services/page.tsx

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { getBrowserClient }    from '@/lib/supabase'
import { CreateLSModal }       from '@/components/create/CreateLSModal'
import { Settings, Search, ArrowRight, Plus } from 'lucide-react'

export default function LocationServicesPage() {
  const [rows,       setRows]       = useState<Record<string, unknown>[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [city,       setCity]       = useState('bangalore')
  const [category,   setCategory]   = useState('')
  const [area,       setArea]       = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const CITIES = ['bangalore', 'mumbai', 'chennai', 'hyderabad']
  const CATS   = ['', 'battery', 'tyre', 'oil-change', 'bike-repair', 'towing', 'roadside-assistance', 'general-repair', 'ac-service']

  const load = async () => {
    setLoading(true)
    const sb = getBrowserClient()
    let q = sb
      .from('location_services')
      .select('id, service_slug, service_name, service_category, city_slug, area_slug, is_active, is_city_level, updated_at')
      .eq('city_slug', city)
      .order('service_category')
      .order('service_name')
    if (category) q = q.eq('service_category', category)
    const { data } = await q
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [city, category])

  const filtered = rows.filter((r) =>
    !search ||
    String(r.service_name).toLowerCase().includes(search.toLowerCase()) ||
    String(r.service_slug).toLowerCase().includes(search.toLowerCase())
  )

  const areaOptions = Array.from(new Set(
    rows
      .filter((r) => !r.is_city_level && r.area_slug)
      .map((r) => String(r.area_slug))
  )).sort((a, z) => a.localeCompare(z))

  const cityRows  = filtered.filter((r) => r.is_city_level)
  const areaRows  = filtered.filter((r) =>
    !r.is_city_level && (!area || String(r.area_slug) === area)
  )

  const RowCard = ({ row }: { row: Record<string, unknown> }) => (
    <Link
      href={`/location-services/${row.id}`}
      className="admin-card flex items-center gap-3 px-4 py-3 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors truncate">
          {String(row.service_name)}
        </p>
        <p className="text-xs text-[#6b7280] mt-0.5">
          {String(row.service_slug)} · {String(row.service_category)}
          {row.area_slug ? ` · ${String(row.area_slug)}` : ' · city-level'}
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
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Location Services
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            Edit pricing, FAQs, testimonials and content for each service.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="admin-btn-primary">
          <Plus className="w-4 h-4" /> New Location Service
        </button>
      </div>
      <CreateLSModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => { setCity(c); setArea('') }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                city === c ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="admin-input w-auto"
        >
          {CATS.map((c) => (
            <option key={c} value={c}>{c || 'All Categories'}</option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="admin-input w-auto min-w-44"
          aria-label="Filter area-level services by area"
        >
          <option value="">All Areas</option>
          {areaOptions.map((areaSlug) => (
            <option key={areaSlug} value={areaSlug}>{areaSlug}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="admin-input pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-[#6b7280] py-16">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* City-level */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
                City-Level Services
              </h2>
              <span className="text-xs text-[#6b7280] bg-[#2a2d3e] px-2 py-0.5 rounded-full">
                {cityRows.length}
              </span>
            </div>
            {cityRows.length === 0
              ? <p className="text-[#6b7280] text-sm italic">No city-level services found.</p>
              : <div className="space-y-2">
                  {cityRows.map((r) => <RowCard key={String(r.id)} row={r} />)}
                </div>
            }
          </div>

          {/* Area-level */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
                Area-Level Services{area ? ` · ${area}` : ''}
              </h2>
              <span className="text-xs text-[#6b7280] bg-[#2a2d3e] px-2 py-0.5 rounded-full">
                {areaRows.length}
              </span>
            </div>
            {areaRows.length === 0 ? (
              <p className="text-[#6b7280] text-sm italic">
                No area-level services found{area ? ` for ${area}` : ''}.
              </p>
            ) : (
              <div className="space-y-2">
                {areaRows.map((r) => <RowCard key={String(r.id)} row={r} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
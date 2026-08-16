'use client'
// app/(admin)/brands/page.tsx
// Brand landing pages (/brands/[slug] on the public site) — one page per
// vehicle brand actually tied to a real service in service_brands.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { Search, ArrowRight, Car, Bike, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

const TYPES = ['', 'car', 'bike']

export default function BrandsPage() {
  const sb = getBrowserClient()
  const [brands,   setBrands]   = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [vehicleType, setVehicleType] = useState('')

  const load = async () => {
    setLoading(true)
    let q = sb.from('brand_pages')
      .select('id,slug,brand_name,vehicle_type,tagline,logo_url,meta_title,is_active')
      .order('vehicle_type')
      .order('sort_order')
    if (vehicleType) q = q.eq('vehicle_type', vehicleType)
    const { data } = await q
    setBrands(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [vehicleType])

  const filtered = brands.filter((b) =>
    !search ||
    String(b.brand_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    String(b.slug ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const groups = filtered.reduce<Record<string, typeof brands>>((acc, b) => {
    const type = String(b.vehicle_type ?? 'other')
    if (!acc[type]) acc[type] = []
    acc[type].push(b)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-400" />
            Brand Pages
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            Doorstep repair landing pages by vehicle brand — {brands.length} brands
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1 flex-wrap">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setVehicleType(t)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                vehicleType === t ? 'tab-active' : 'tab-inactive')}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands…" className="admin-input pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([type, list]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                {type === 'car' ? <Car className="w-4 h-4 text-blue-400" /> : <Bike className="w-4 h-4 text-red-400" />}
                <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider capitalize">{type} Brands</h2>
                <span className="text-xs text-[#6b7280] bg-[#2a2d3e] px-2 py-0.5 rounded-full">{list.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {list.map((b) => (
                  <Link key={String(b.id)} href={`/brands/${b.slug}`}
                    className="admin-card p-4 flex items-start gap-3 hover:border-blue-500/30 transition-all group">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#e2e8f0] text-sm truncate group-hover:text-blue-400 transition-colors">
                        {String(b.brand_name ?? '—')}
                      </p>
                      <p className="text-xs text-[#6b7280] truncate mt-0.5">{String(b.tagline ?? 'No tagline set')}</p>
                      {!b.meta_title && (
                        <p className="text-xs text-amber-400 font-semibold mt-1">Missing SEO content</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#6b7280] flex-shrink-0 group-hover:text-blue-400 transition-colors mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#6b7280]">
              <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No brands found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

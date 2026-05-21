'use client'
// app/(admin)/services/page.tsx — Global services list

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import { getBrowserClient }    from '@/lib/supabase'
import { Search, ArrowRight, Package, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

const CATS = ['', 'car', 'bike', 'battery', 'tyre', 'towing', 'roadside']

export default function ServicesPage() {
  const [services,  setServices]  = useState<Record<string, unknown>[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const sb = getBrowserClient()
      let q = sb
        .from('services')
        .select('id, slug, category, title, short_title, tagline, price, duration, icon, updated_at')
        .order('category')
        .order('title')
      if (category) q = q.eq('category', category)
      const { data } = await q
      setServices(data ?? [])
      setLoading(false)
    }
    load()
  }, [category])

  const filtered = services.filter((s) =>
    !search ||
    String(s.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.slug  ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const groups = filtered.reduce<Record<string, typeof services>>((acc, s) => {
    const cat = String(s.category ?? 'other')
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            Services
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">Global service catalogue — all cities</p>
        </div>
        <span className="text-xs text-[#6b7280] bg-[#2a2d3e] px-3 py-1.5 rounded-full">
          {filtered.length} services
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1 flex-wrap">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
                category === c ? 'tab-active' : 'tab-inactive'
              )}
            >
              {c || 'All'}
            </button>
          ))}
        </div>
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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([cat, svcs]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider capitalize">{cat}</h2>
                <span className="text-xs text-[#6b7280] bg-[#2a2d3e] px-2 py-0.5 rounded-full">{svcs.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {svcs.map((s) => (
                  <Link
                    key={String(s.id)}
                    href={`/services/${s.slug}`}
                    className="admin-card p-4 flex items-start gap-3 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#e2e8f0] text-sm truncate group-hover:text-blue-400 transition-colors">
                        {String(s.short_title ?? s.title ?? '—')}
                      </p>
                      <p className="text-xs text-[#6b7280] truncate mt-0.5">{String(s.tagline ?? '')}</p>
                      <p className="text-xs text-blue-400 font-semibold mt-1">{String(s.price ?? '')}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#6b7280] flex-shrink-0 group-hover:text-blue-400 transition-colors mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#6b7280]">No services found.</div>
          )}
        </div>
      )}
    </div>
  )
}

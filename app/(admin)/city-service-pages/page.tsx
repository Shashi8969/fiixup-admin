'use client'
 
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { Layers, ArrowRight } from 'lucide-react'
 
export default function CityServicePagesListPage() {
  const [rows, setRows]     = useState<Record<string, unknown>[]>([])
  const [city, setCity]     = useState('bangalore')
  const [loading, setLoading] = useState(true)
  const CITIES = ['bangalore', 'mumbai', 'chennai', 'hyderabad']
 
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const sb = getBrowserClient()
      const { data } = await sb
        .from('city_service_pages')
        .select('id, city_slug, category_slug, meta_title, hero_heading, is_active, updated_at')
        .eq('city_slug', city)
        .order('category_slug')
      setRows(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [city])
 
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-amber-400" />
          City Service Category Pages
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">
          Edit the /{city}/services/battery type pages — hero, about, pricing, FAQs, testimonials.
        </p>
      </div>
 
      <div className="flex gap-1 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-1">
        {CITIES.map((c) => (
          <button key={c} onClick={() => setCity(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${city === c ? 'tab-active' : 'tab-inactive'}`}
          >{c}</button>
        ))}
      </div>
 
      {loading ? (
        <div className="text-center text-[#6b7280] py-12">Loading…</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Link key={String(row.id)} href={`/city-service-pages/${row.id}`}
              className="admin-card flex items-center gap-4 px-5 py-4 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white group-hover:text-amber-300 transition-colors capitalize">
                  {String(row.category_slug)} in {String(row.city_slug)}
                </p>
                <p className="text-sm text-[#6b7280] truncate mt-0.5">{String(row.hero_heading)}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                row.is_active ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-gray-500 bg-gray-500/10 border-gray-500/20'
              }`}>
                {row.is_active ? 'Active' : 'Inactive'}
              </span>
              <ArrowRight className="w-4 h-4 text-[#6b7280] group-hover:text-white flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
 
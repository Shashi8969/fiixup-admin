'use client'
// app/(admin)/cities/page.tsx

import { useEffect, useState } from 'react'
import Link              from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import { CreateCityModal } from '@/components/create/CreateCityModal'
import { MapPin, ArrowRight, Phone, Plus, Loader2 } from 'lucide-react'

type City = { id: string; slug: string; name: string; state: string; phone: string; meta_title: string }

export default function CitiesPage() {
  const sb = getBrowserClient()
  const [cities,  setCities]  = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await sb.from('cities').select('id,slug,name,state,phone,meta_title').order('name')
    setCities(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-400" />
            Cities
          </h1>
          <p className="text-sm text-[#6b7280] mt-1">
            {cities.length} cities · Click a city to edit content, areas, FAQs, testimonials
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="admin-btn-primary">
          <Plus className="w-4 h-4" /> New City
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {cities.map(city => (
            <Link key={city.id} href={`/cities/${city.slug}`}
              className="admin-card flex items-center gap-4 px-5 py-4 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group">
              <div className="w-10 h-10 bg-blue-600/10 border border-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white group-hover:text-blue-300 transition-colors">{city.name}</p>
                <p className="text-sm text-[#6b7280] mt-0.5">{city.state}</p>
              </div>
              {city.phone && (
                <div className="flex items-center gap-1.5 text-xs text-[#6b7280] flex-shrink-0">
                  <Phone className="w-3.5 h-3.5" />{city.phone}
                </div>
              )}
              <ArrowRight className="w-4 h-4 text-[#6b7280] group-hover:text-blue-400 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <CreateCityModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  )
}
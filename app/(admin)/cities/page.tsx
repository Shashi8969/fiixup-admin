// app/(admin)/cities/page.tsx

import Link from 'next/link'
import { getServerClient } from '@/lib/supabase-server'
import { MapPin, ArrowRight, Phone, Globe } from 'lucide-react'

export default async function CitiesPage() {
  const sb = await getServerClient()
  const { data: cities } = await sb
    .from('cities')
    .select('id, slug, name, state, phone, meta_title, updated_at')
    .order('name')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-400" />
          Cities
        </h1>
        <p className="text-[#94a3b8] text-sm mt-1">
          Edit city-level content — hero copy, about section, testimonials, FAQs.
        </p>
      </div>

      <div className="space-y-3">
        {(cities ?? []).map((city) => (
          <Link
            key={city.id}
            href={`/cities/${city.slug}`}
            className="admin-card flex items-center gap-4 px-5 py-4 hover:border-[#3a3d4e] hover:bg-[#1e2133] transition-all group"
          >
            <div className="w-10 h-10 bg-blue-600/10 border border-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white group-hover:text-blue-300 transition-colors">
                {city.name}
              </p>
              <p className="text-sm text-[#6b7280] truncate mt-0.5">{city.state}</p>
            </div>
            <div className="hidden md:flex items-center gap-4 text-sm text-[#6b7280]">
              {city.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {city.phone}
                </span>
              )}
              <a
                href={`https://fiixup.in/${city.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-blue-400 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Live
              </a>
            </div>
            <ArrowRight className="w-4 h-4 text-[#6b7280] group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
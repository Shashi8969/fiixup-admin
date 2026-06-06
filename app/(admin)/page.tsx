'use client'

// app/(admin)/page.tsx — Dashboard

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase'
import {
  MapPin, Settings, Layers, FileText,
  Package, Globe, ArrowRight, Database,
} from 'lucide-react'

type Stats = {
  cities: number
  ls: number
  csp: number
  posts: number
  services: number
}

const DEFAULT_STATS: Stats = {
  cities: 0,
  ls: 0,
  csp: 0,
  posts: 0,
  services: 0,
}

const NAV_CARDS = [
  { href: '/cities',              icon: MapPin,     label: 'Cities',               desc: 'Edit city hub pages, hero copy, areas, testimonials & FAQs'  },
  { href: '/location-services',  icon: Settings,   label: 'Location Services',    desc: 'Edit pricing, FAQs, testimonials, nearby areas per service'   },
  { href: '/city-service-pages', icon: Layers,     label: 'City Service Pages',   desc: 'Edit category pages (battery, tyre, oil-change per city)'     },
  { href: '/posts',              icon: FileText,   label: 'Blog Posts',           desc: 'Edit post content, SEO meta, featured status'                 },
  { href: '/services',           icon: Package,    label: 'Services',             desc: 'Edit global service catalogue, pricing, brands & FAQs'        },
]

async function getStats(): Promise<Stats> {
  const sb = getBrowserClient()

  const [cities, ls, csp, posts, services] = await Promise.all([
    sb.from('cities').select('id', { count: 'exact', head: true }),
    sb.from('location_services').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('city_service_pages').select('id', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('posts').select('id', { count: 'exact', head: true }),
    sb.from('services').select('id', { count: 'exact', head: true }),
  ])

  return {
    cities:   cities.count   ?? 0,
    ls:       ls.count       ?? 0,
    csp:      csp.count      ?? 0,
    posts:    posts.count    ?? 0,
    services: services.count ?? 0,
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)

  useEffect(() => {
    let active = true

    getStats()
      .then((nextStats) => {
        if (active) setStats(nextStats)
      })
      .catch(() => {
        if (active) setStats(DEFAULT_STATS)
      })

    return () => {
      active = false
    }
  }, [])

  const STAT_CARDS = useMemo(() => [
    { label: 'Cities',            value: stats.cities,   icon: Globe    },
    { label: 'Location Services', value: stats.ls,       icon: Settings },
    { label: 'City Svc Pages',    value: stats.csp,      icon: Layers   },
    { label: 'Blog Posts',        value: stats.posts,    icon: FileText },
    { label: 'Services',          value: stats.services, icon: Package  },
  ], [stats])

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-400" />
          Dashboard
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Fiixup Admin — manage all content from one place
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {STAT_CARDS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="admin-card p-4 text-center">
            <Icon className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-extrabold text-white">{value}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Nav cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {NAV_CARDS.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="admin-card p-5 flex items-start gap-4 hover:border-blue-500/40 transition-all group"
          >
            <div className="bg-blue-500/10 p-2.5 rounded-xl flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#e2e8f0] group-hover:text-white transition-colors">{label}</p>
              <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#4b5563] group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
          </Link>
        ))}
      </div>

    </div>
  )
}

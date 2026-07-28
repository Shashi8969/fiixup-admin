'use client'
// app/(admin)/site-health/page.tsx
// Unified site health dashboard — merges the previous /project-audit,
// /seo-health, and /cms-health pages, plus the new 404/broken-links detector,
// into one place. Old routes now redirect here with the matching ?tab=.

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, Gauge, LayoutDashboard, RouteOff } from 'lucide-react'
import { clsx } from 'clsx'
import { OverviewSection } from '@/components/health/sections/OverviewSection'
import { SeoHealthSection } from '@/components/health/sections/SeoHealthSection'
import { CmsHealthSection } from '@/components/health/sections/CmsHealthSection'
import { BrokenLinksPanel } from '@/components/brokenLinks/BrokenLinksPanel'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'broken-links', label: 'Broken Links', icon: RouteOff },
  { id: 'seo-health', label: 'SEO Health', icon: Gauge },
  { id: 'cms-health', label: 'CMS Health', icon: Activity },
] as const

type TabId = (typeof TABS)[number]['id']

function SiteHealthInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) ?? 'overview'
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : 'overview')

  const goToTab = (id: string) => {
    setTab(id as TabId)
    router.replace(`/site-health?tab=${id}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-400" />
          Site Health
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Everything that used to live across Project Audit, SEO Health, and CMS Health — plus real-time 404 detection — in one place.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2a2d3e] bg-[#111827] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => goToTab(id)}
            className={clsx(
              'flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === id ? 'bg-blue-600 text-white' : 'text-[#94a3b8] hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewSection onNavigateTab={goToTab} />}
      {tab === 'broken-links' && <BrokenLinksPanel />}
      {tab === 'seo-health' && <SeoHealthSection />}
      {tab === 'cms-health' && <CmsHealthSection />}
    </div>
  )
}

export default function SiteHealthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#94a3b8]">Loading…</div>}>
      <SiteHealthInner />
    </Suspense>
  )
}

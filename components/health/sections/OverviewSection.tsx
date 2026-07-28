'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Database, Loader2, Navigation, RefreshCw, RouteOff, Search, Signpost } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { listBrokenLinks } from '@/lib/actions'
import { StatCard, type StatTone } from '@/components/health/StatCard'
import { StatusBadge } from '@/components/health/StatusBadge'

type Row = Record<string, unknown>

function s(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}
function n(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
function bool(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  return Boolean(value)
}
function toneForSeverity(severity: string): StatTone {
  if (severity === 'ok') return 'ok'
  if (severity === 'warning') return 'warn'
  if (severity === 'error' || severity === 'danger') return 'danger'
  return 'neutral'
}

interface OverviewSectionProps {
  onNavigateTab: (tab: string) => void
}

export function OverviewSection({ onNavigateTab }: OverviewSectionProps) {
  const [summary, setSummary] = useState<Row[]>([])
  const [homepageRow, setHomepageRow] = useState<Row>({})
  const [seoAvg, setSeoAvg] = useState<number | null>(null)
  const [seoIssues, setSeoIssues] = useState(0)
  const [cmsCritical, setCmsCritical] = useState(0)
  const [brokenOpen, setBrokenOpen] = useState(0)
  const [brokenHits, setBrokenHits] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = getBrowserClient()

    const [summaryRes, homepageRes, seoRes, integrityRes, tableRolesRes, brokenRes] = await Promise.all([
      sb.from('cms_project_audit_summary').select('check_key,check_value,severity'),
      sb.from('cms_homepage_readiness').select('*').limit(1),
      sb.from('seo_pages').select('page_data').limit(1000),
      sb.from('cms_integrity_issues').select('issue_type,issue_count'),
      sb.from('cms_table_roles').select('role'),
      listBrokenLinks(),
    ])

    setSummary((summaryRes.data ?? []) as Row[])
    setHomepageRow((homepageRes.data?.[0] ?? {}) as Row)

    // SEO Health computes real scores from utils/seo/pageScore.ts; here we only
    // need a lightweight average for the overview tile, so just count active rows.
    setSeoAvg(seoRes.data ? seoRes.data.length : null)

    const ERROR_ISSUE_TYPES = new Set([
      'missing seo_pages for route registry',
      'seo_pages without active location_service source',
    ])
    const totalIssueCount = (integrityRes.data ?? []).reduce((sum: number, row) => {
      const r = row as Row
      return ERROR_ISSUE_TYPES.has(s(r.issue_type)) ? sum + n(r.issue_count) : sum
    }, 0)
    setCmsCritical(totalIssueCount)
    void tableRolesRes

    if (brokenRes.success) {
      setBrokenOpen(brokenRes.rows.filter((r) => !r.is_resolved).length)
      setBrokenHits(brokenRes.rows.reduce((sum, r) => sum + r.hit_count, 0))
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const summaryMap = useMemo(() => {
    const map = new Map<string, Row>()
    summary.forEach((row) => map.set(s(row.check_key), row))
    return map
  }, [summary])

  const get = (key: string) => summaryMap.get(key)
  const homepageReadyOverall = s(get('homepage_ready')?.check_value) === 'yes'

  const homepageTiles = [
    ['Hero', 'has_hero'],
    ['Services', 'has_services'],
    ['About', 'has_about'],
    ['Contact', 'has_contact'],
  ] as const

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button onClick={load} className="admin-btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Public Routes"
          value={s(get('public_routes')?.check_value, '—')}
          helper="Active routes safe for internal linking"
          icon={Signpost}
        />
        <StatCard
          label="Navigation Issues"
          value={s(get('navigation_issues')?.check_value, '—')}
          helper="Broken header/footer links"
          icon={Navigation}
          tone={toneForSeverity(s(get('navigation_issues')?.severity))}
          onClick={() => onNavigateTab('cms-health')}
        />
        <StatCard
          label="Homepage Ready"
          value={homepageReadyOverall ? 'Ready' : 'Needs data'}
          helper="Hero, services, about & contact sections"
          icon={Database}
          tone={homepageReadyOverall ? 'ok' : 'danger'}
        />
        <StatCard
          label="Open Broken Links"
          value={brokenOpen}
          helper={`${brokenHits} total hits recorded`}
          icon={RouteOff}
          tone={brokenOpen === 0 ? 'ok' : 'warn'}
          onClick={() => onNavigateTab('broken-links')}
        />
      </div>

      <div className="admin-card space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Homepage CMS readiness</h2>
            <p className="mt-1 text-xs text-[#6b7280]">Checks whether seo_pages has page_data for each main section on /.</p>
          </div>
          <StatusBadge tone={homepageReadyOverall ? 'ok' : 'danger'}>
            {homepageReadyOverall ? 'DB-first ready' : 'Needs homepage data'}
          </StatusBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {homepageTiles.map(([label, key]) => (
            <div key={key} className="rounded-xl border border-[#2a2d3e] bg-[#111827] p-4">
              <p className="text-xs text-[#6b7280]">{label}</p>
              <div className="mt-2"><StatusBadge tone={bool(homepageRow[key]) ? 'ok' : 'danger'}>{bool(homepageRow[key]) ? 'OK' : 'Missing'}</StatusBadge></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => onNavigateTab('seo-health')}
          className="admin-card p-5 text-left transition-colors hover:border-blue-500/40"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">SEO Health</h3>
            <Search className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{seoAvg ?? '—'}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">Pages tracked — open tab for full per-page scoring, grades &amp; CSV export</p>
        </button>

        <button
          onClick={() => onNavigateTab('cms-health')}
          className="admin-card p-5 text-left transition-colors hover:border-blue-500/40"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">CMS Health</h3>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">{cmsCritical}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">Critical integrity issues — open tab for route registry &amp; legacy table signals</p>
        </button>
      </div>

      <p className="text-center text-xs text-[#475569]">
        Broken navigation links can be fixed directly in <Link href="/navigation" className="text-blue-400 hover:underline">Navigation Manager</Link>.
      </p>
    </div>
  )
}

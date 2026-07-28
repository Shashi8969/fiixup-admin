'use client'
// components/health/sections/CmsHealthSection.tsx
// Read-only CMS health dashboard for Supabase audit views. Ported from the
// standalone /cms-health page, with severity/counting fixed to read the real
// structured columns (issue_type + issue_count, cms_table_roles.role) instead
// of keyword-sniffing lowercased row text.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Table2,
} from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { StatCard } from '@/components/health/StatCard'

type RowRecord = Record<string, unknown>

type HealthState = {
  integrityIssues: RowRecord[]
  tableRoles: RowRecord[]
  routeRegistry: RowRecord[]
  errors: string[]
}

const EMPTY_HEALTH: HealthState = {
  integrityIssues: [],
  tableRoles: [],
  routeRegistry: [],
  errors: [],
}

// Real, confirmed values of cms_integrity_issues.issue_type — verified against
// the live view rather than guessed from keywords in row text.
const ISSUE_SEVERITY: Record<string, 'error' | 'warning' | 'info'> = {
  'missing seo_pages for route registry': 'error',
  'seo_pages without active location_service source': 'error',
  'location service faq cache mismatch': 'warning',
  'candidate unused tables listed': 'info',
  'legacy testimonial tables listed': 'info',
}

function textValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function field(row: RowRecord, keys: string[], fallback = '—'): string {
  for (const key of keys) {
    const value = row[key]
    const text = textValue(value).trim()
    if (text) return text
  }
  return fallback
}

function issueSeverity(row: RowRecord): 'error' | 'warning' | 'info' {
  return ISSUE_SEVERITY[textValue(row.issue_type)] ?? 'warning'
}

function issueCount(row: RowRecord): number {
  const n = Number(row.issue_count)
  return Number.isFinite(n) ? n : 0
}

function badgeClass(kind: 'good' | 'warning' | 'danger' | 'neutral') {
  if (kind === 'good') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (kind === 'warning') return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
  if (kind === 'danger') return 'bg-red-500/10 text-red-400 border-red-500/20'
  return 'bg-[#2a2d3e] text-[#94a3b8] border-[#3a3d4e]'
}

function JsonPreview({ row }: { row: RowRecord }) {
  const entries = Object.entries(row).filter(([, value]) => value !== null && value !== undefined && textValue(value).trim())

  if (entries.length === 0) {
    return <span className="text-[#6b7280]">No details available</span>
  }

  return (
    <div className="grid md:grid-cols-2 gap-2">
      {entries.slice(0, 10).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[#6b7280]">{key}</p>
          <p className="text-xs text-[#cbd5e1] mt-1 break-words">{textValue(value)}</p>
        </div>
      ))}
    </div>
  )
}

async function readAuditViews(): Promise<HealthState> {
  const sb = getBrowserClient()
  const errors: string[] = []

  const [integrityRes, rolesRes, routesRes] = await Promise.all([
    sb.from('cms_integrity_issues').select('*').limit(200),
    sb.from('cms_table_roles').select('*').limit(300),
    sb.from('cms_route_registry').select('*').limit(1000),
  ])

  if (integrityRes.error) errors.push(`cms_integrity_issues: ${integrityRes.error.message}`)
  if (rolesRes.error) errors.push(`cms_table_roles: ${rolesRes.error.message}`)
  if (routesRes.error) errors.push(`cms_route_registry: ${routesRes.error.message}`)

  return {
    integrityIssues: (integrityRes.data ?? []) as RowRecord[],
    tableRoles: (rolesRes.data ?? []) as RowRecord[],
    routeRegistry: (routesRes.data ?? []) as RowRecord[],
    errors,
  }
}

export function CmsHealthSection() {
  const [state, setState] = useState<HealthState>(EMPTY_HEALTH)
  const [loading, setLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const nextState = await readAuditViews()
      setState(nextState)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load CMS health data'
      setState({ ...EMPTY_HEALTH, errors: [message] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  const summary = useMemo(() => {
    const errorIssues = state.integrityIssues
      .filter((row) => issueSeverity(row) === 'error')
      .reduce((sum, row) => sum + issueCount(row), 0)
    const warningIssues = state.integrityIssues
      .filter((row) => issueSeverity(row) === 'warning')
      .reduce((sum, row) => sum + issueCount(row), 0)

    return {
      totalIssues: state.integrityIssues.length,
      errorIssues,
      warningIssues,
      routes: state.routeRegistry.length,
      tableRoles: state.tableRoles.length,
      candidateUnused: state.tableRoles.filter((row) => textValue(row.role) === 'candidate_unused').length,
      legacyTables: state.tableRoles.filter((row) => textValue(row.role) === 'legacy_child').length,
    }
  }, [state])

  const healthy = summary.errorIssues === 0 && state.errors.length === 0

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={fetchHealth} disabled={loading} className="admin-btn-secondary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className={`admin-card p-5 border ${healthy ? 'border-emerald-500/20' : 'border-amber-500/20'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${healthy ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
            {healthy ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            )}
          </div>
          <div>
            <p className="font-semibold text-white">
              {healthy ? 'CMS audit views are reachable and no critical issue was detected.' : 'CMS health needs review.'}
            </p>
            <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
              This page does not change your database. It only reads existing Supabase audit views and shows where content, routes, or legacy tables need attention.
            </p>
          </div>
        </div>
      </div>

      {state.errors.length > 0 && (
        <div className="admin-card p-5 border-red-500/20 bg-red-500/5">
          <p className="font-semibold text-red-300 flex items-center gap-2">
            <FileWarning className="w-4 h-4" />
            Audit view access errors
          </p>
          <div className="mt-3 space-y-2">
            {state.errors.map((error) => (
              <p key={error} className="text-xs text-red-200 bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Integrity rows" value={summary.totalIssues} icon={AlertTriangle} />
        <StatCard label="Routes checked" value={summary.routes} />
        <StatCard label="Table role rows" value={summary.tableRoles} icon={Table2} />
        <StatCard
          label="Critical issues"
          value={summary.errorIssues}
          icon={ShieldCheck}
          tone={summary.errorIssues === 0 ? 'ok' : 'danger'}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="admin-card p-5">
          <p className="admin-section-title">Legacy / cleanup signals</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-4">
              <p className="text-2xl font-extrabold text-white">{summary.candidateUnused}</p>
              <p className="text-xs text-[#6b7280] mt-1">Candidate unused tables</p>
            </div>
            <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-4">
              <p className="text-2xl font-extrabold text-white">{summary.legacyTables}</p>
              <p className="text-xs text-[#6b7280] mt-1">Legacy child tables</p>
            </div>
          </div>
          <p className="text-xs text-[#6b7280] mt-4 leading-relaxed">
            These are review signals, not automatic delete instructions. Keep legacy tables until review migration is complete.
          </p>
        </div>

        <div className="admin-card p-5">
          <p className="admin-section-title">Recommended review order</p>
          <div className="mt-4 space-y-2 text-xs text-[#cbd5e1]">
            <p className="rounded-lg bg-[#0f1117] border border-[#2a2d3e] px-3 py-2">1. Fix missing route / seo_pages cache rows first.</p>
            <p className="rounded-lg bg-[#0f1117] border border-[#2a2d3e] px-3 py-2">2. Fix FAQ cache mismatch rows before publishing more pages.</p>
            <p className="rounded-lg bg-[#0f1117] border border-[#2a2d3e] px-3 py-2">3. Treat unused and legacy tables as migration notes, not errors.</p>
          </div>
        </div>
      </div>

      <section className="admin-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="admin-section-title">Integrity issues</p>
            <p className="text-xs text-[#6b7280] mt-1">Source: cms_integrity_issues</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${badgeClass(summary.errorIssues > 0 ? 'danger' : summary.warningIssues > 0 ? 'warning' : 'good')}`}>
            {summary.errorIssues > 0 ? `${summary.errorIssues} critical` : summary.warningIssues > 0 ? `${summary.warningIssues} warning` : 'Healthy'}
          </span>
        </div>

        {state.integrityIssues.length === 0 ? (
          <p className="text-sm text-[#94a3b8] bg-[#0f1117] border border-[#2a2d3e] rounded-xl px-4 py-5">
            No integrity rows returned. If your audit views are configured, this usually means there are no current integrity issues.
          </p>
        ) : (
          <div className="space-y-3">
            {state.integrityIssues.map((row, index) => {
              const severity = issueSeverity(row)
              const count = issueCount(row)
              return (
                <div key={index} className="rounded-xl border border-[#2a2d3e] bg-[#11141d] p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${badgeClass(severity === 'error' ? 'danger' : severity === 'warning' ? 'warning' : 'neutral')}`}>
                      {severity}
                    </span>
                    <p className="text-sm font-semibold text-white">
                      {field(row, ['issue_type'], `Issue ${index + 1}`)}
                    </p>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${badgeClass(count > 0 ? (severity === 'error' ? 'danger' : 'warning') : 'good')}`}>
                      {count} row{count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <JsonPreview row={row} />
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="admin-card p-5 overflow-hidden">
          <p className="admin-section-title">Route registry sample</p>
          <p className="text-xs text-[#6b7280] mt-1 mb-4">Source: cms_route_registry</p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {state.routeRegistry.slice(0, 80).map((row, index) => (
              <div key={index} className="rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2">
                <p className="text-xs text-white break-words">{field(row, ['public_path', 'url_path', 'route_path', 'path', 'canonical_url'])}</p>
                <p className="text-[11px] text-[#6b7280] mt-1">
                  {field(row, ['route_type', 'page_type', 'source_table', 'table_name'], 'route')}
                </p>
              </div>
            ))}
            {!loading && state.routeRegistry.length === 0 && <p className="text-sm text-[#94a3b8]">No route rows returned.</p>}
          </div>
        </div>

        <div className="admin-card p-5 overflow-hidden">
          <p className="admin-section-title">Table role sample</p>
          <p className="text-xs text-[#6b7280] mt-1 mb-4">Source: cms_table_roles</p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {state.tableRoles.slice(0, 80).map((row, index) => (
              <div key={index} className="rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2">
                <p className="text-xs text-white break-words">{field(row, ['table_name', 'name', 'relation_name'])}</p>
                <p className="text-[11px] text-[#6b7280] mt-1 break-words">
                  {field(row, ['role'], 'table role')}
                </p>
              </div>
            ))}
            {!loading && state.tableRoles.length === 0 && <p className="text-sm text-[#94a3b8]">No table role rows returned.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

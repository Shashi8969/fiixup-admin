"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getBrowserClient } from "@/lib/supabase"
import { showToast } from "@/components/ui/Toast"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Database,
  ExternalLink,
  Link2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react"

type Row = Record<string, unknown>

type QueryState = {
  summary: Row[]
  homepage: Row[]
  navigationIssues: Row[]
  scopedNavigationIssues: Row[]
  publicRoutes: Row[]
  loading: boolean
}

const EMPTY_STATE: QueryState = {
  summary: [],
  homepage: [],
  navigationIssues: [],
  scopedNavigationIssues: [],
  publicRoutes: [],
  loading: true,
}

function s(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function n(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase())
  return Boolean(value)
}

function statusBadge(ok: boolean, label?: string) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${ok ? "border-green-500/20 bg-green-500/10 text-green-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
      {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label ?? (ok ? "OK" : "Needs fix")}
    </span>
  )
}

async function safeSelect(table: string, select = "*", limit = 200): Promise<Row[]> {
  const sb = getBrowserClient()
  const { data, error } = await sb.from(table).select(select).limit(limit)
if (error) return []
return (data ?? []) as unknown as Row[]
}

export default function ProjectAuditPage() {
  const [state, setState] = useState<QueryState>(EMPTY_STATE)

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }))

    const [summary, homepage, navigationIssues, scopedNavigationIssues, publicRoutes] = await Promise.all([
      safeSelect("cms_project_audit_summary"),
      safeSelect("cms_homepage_readiness"),
      safeSelect("cms_navigation_link_issues"),
      safeSelect("cms_scoped_navigation_link_issues"),
      safeSelect("cms_public_route_registry", "*", 500),
    ])

    setState({ summary, homepage, navigationIssues, scopedNavigationIssues, publicRoutes, loading: false })
  }, [])

  useEffect(() => {
    load().catch((error) => showToast("error", error instanceof Error ? error.message : "Audit load failed"))
  }, [load])

  const summaryMap = useMemo(() => {
    const map = new Map<string, Row>()
    state.summary.forEach((row) => map.set(s(row.metric_key), row))
    return map
  }, [state.summary])

  const homepageRow = state.homepage[0] ?? {}
  const homepageReady = ["has_hero", "has_services", "has_about", "has_city_coverage", "has_contact"].every((key) => bool(homepageRow[key]))
  const issueCount = state.navigationIssues.length + state.scopedNavigationIssues.length
  const routeCount = state.publicRoutes.length

  const topCards = [
    {
      label: "Public routes",
      value: routeCount,
      helper: "Active routes available for safe internal linking",
      icon: Link2,
      ok: routeCount > 0,
    },
    {
      label: "Navigation issues",
      value: issueCount,
      helper: "Broken active header/footer/internal links found by audit views",
      icon: AlertTriangle,
      ok: issueCount === 0,
    },
    {
      label: "Homepage DB data",
      value: homepageReady ? "Ready" : "Partial",
      helper: "Checks seo_pages row for / and required homepage sections",
      icon: Database,
      ok: homepageReady,
    },
    {
      label: "SEO pages",
      value: n(summaryMap.get("seo_pages_active")?.metric_value, 0),
      helper: "Active seo_pages rows powering frontend cache",
      icon: Activity,
      ok: n(summaryMap.get("seo_pages_active")?.metric_value, 0) > 0,
    },
  ]

  const renderIssueTable = (title: string, rows: Row[]) => (
    <div className="admin-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-400" />
            {title}
          </h2>
          <p className="text-xs text-[#6b7280] mt-1">Only active internal links that do not match a known public route are listed.</p>
        </div>
        {statusBadge(rows.length === 0, rows.length === 0 ? "Clean" : `${rows.length} issue${rows.length === 1 ? "" : "s"}`)}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-200">
          No broken active links found in this audit view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#2a2d3e]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#111827] text-[#94a3b8]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Area / scope</th>
                <th className="px-4 py-3 text-left font-semibold">Label</th>
                <th className="px-4 py-3 text-left font-semibold">Problem URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d3e]">
              {rows.map((row, index) => (
                <tr key={`${s(row.id)}-${index}`} className="text-[#e5e7eb]">
                  <td className="px-4 py-3 text-[#94a3b8]">{s(row.nav_area) || s(row.scope_type) || "global"}</td>
                  <td className="px-4 py-3 font-medium">{s(row.label, "Untitled")}</td>
                  <td className="px-4 py-3 font-mono text-xs text-red-300">{s(row.normalized_href) || s(row.href)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-400" />
            Project Audit
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Final QA dashboard for homepage CMS data, navigation safety, route registry and SEO cache health.
          </p>
        </div>
        <button
          onClick={load}
          disabled={state.loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2a2d3e] bg-[#1a1d27] px-4 py-2 text-sm font-semibold text-[#e5e7eb] hover:border-blue-500/40 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
          Refresh audit
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topCards.map(({ label, value, helper, icon: Icon, ok }) => (
          <div key={label} className="admin-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5">
                <Icon className="h-5 w-5 text-blue-400" />
              </div>
              {statusBadge(ok)}
            </div>
            <p className="mt-4 text-2xl font-extrabold text-white">{value}</p>
            <p className="mt-1 text-sm font-semibold text-[#e2e8f0]">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">{helper}</p>
          </div>
        ))}
      </div>

      <div className="admin-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Homepage CMS readiness</h2>
            <p className="text-xs text-[#6b7280] mt-1">Checks if seo_pages has page_data for the main sections on /.</p>
          </div>
          {statusBadge(homepageReady, homepageReady ? "DB-first ready" : "Needs homepage data")}
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {[
            ["Hero", "has_hero"],
            ["Services", "has_services"],
            ["About", "has_about"],
            ["City coverage", "has_city_coverage"],
            ["Contact", "has_contact"],
          ].map(([label, key]) => (
            <div key={key} className="rounded-xl border border-[#2a2d3e] bg-[#111827] p-4">
              <p className="text-xs text-[#6b7280]">{label}</p>
              <div className="mt-2">{statusBadge(bool(homepageRow[key]))}</div>
            </div>
          ))}
        </div>
      </div>

      {renderIssueTable("Navigation link issues", state.navigationIssues)}
      {renderIssueTable("Scoped navigation link issues", state.scopedNavigationIssues)}

      <div className="admin-card p-5 space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-blue-400" />
          Recommended next fixes
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[#2a2d3e] bg-[#111827] p-4 text-sm text-[#cbd5e1]">
            <p className="font-semibold text-white">1. Fill homepage page_data</p>
            <p className="mt-1 text-xs text-[#6b7280]">Hero, services text, about, city coverage and contact should live in seo_pages for /.</p>
          </div>
          <div className="rounded-xl border border-[#2a2d3e] bg-[#111827] p-4 text-sm text-[#cbd5e1]">
            <p className="font-semibold text-white">2. Fix broken navigation rows</p>
            <p className="mt-1 text-xs text-[#6b7280]">Use Navigation Manager and choose only URLs that exist in the public route registry.</p>
          </div>
          <div className="rounded-xl border border-[#2a2d3e] bg-[#111827] p-4 text-sm text-[#cbd5e1]">
            <p className="font-semibold text-white">3. Use scoped links</p>
            <p className="mt-1 text-xs text-[#6b7280]">Global, city, area and exact page links should be separate so city pages do not link to wrong global URLs.</p>
          </div>
          <div className="rounded-xl border border-[#2a2d3e] bg-[#111827] p-4 text-sm text-[#cbd5e1]">
            <p className="font-semibold text-white">4. Revalidate after edits</p>
            <p className="mt-1 text-xs text-[#6b7280]">Navigation, FAQ, reviews, homepage and seo_pages should clear frontend cache immediately after admin changes.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

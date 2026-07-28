'use client'
// components/health/sections/SeoHealthSection.tsx
// RankMath/Yoast-style SEO scoreboard across every page type. Reads the
// existing seo_pages cache, scores each row client-side via
// utils/seo/pageScore.ts, ranked worst-first with one-click editor links.
// Ported from the standalone /seo-health page — scoring logic untouched.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download,
  ImageOff, Loader2, RefreshCw, Search, XCircle,
} from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { extractPageSignals, type SeoPageRow } from '@/utils/seo/pageSignals'
import { scorePage, type Grade, type PageScoreResult, type CheckStatus } from '@/utils/seo/pageScore'
import { resolveEditorHref } from '@/utils/seo/editorLink'
import { StatCard } from '@/components/health/StatCard'

type ScoredPage = {
  row: SeoPageRow
  result: PageScoreResult
}

const GRADE_STYLE: Record<Grade, string> = {
  A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  B: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  C: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  D: 'bg-red-500/10 text-red-400 border-red-500/20',
}

const STATUS_ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  fail: <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
}

const PAGE_TYPE_LABEL: Record<string, string> = {
  home: 'Homepage',
  city_hub: 'City',
  area_service: 'Area Service',
  city_service: 'City Service',
  city_service_category: 'Category Page',
  post: 'Blog Post',
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function SeoHealthSection() {
  const [pages, setPages] = useState<ScoredPage[]>([])
  const [loading, setLoading] = useState(true)
  const [pageTypeFilter, setPageTypeFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState<'all' | Grade>('all')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const sb = getBrowserClient()
    const { data } = await sb
      .from('seo_pages')
      .select('id,url_path,page_type,meta_title,meta_description,meta_keywords,canonical_url,og_image_url,og_image_width,og_image_height,schema_json,page_data,internal_links_json,related_services_json,nearby_areas_json,is_active,is_indexed,post_id,location_service_id,service_id,city_id,city_service_page_id,area_id,updated_at')
      .limit(1000)

    const rows = (data ?? []) as SeoPageRow[]
    const scored = rows.map((row) => ({ row, result: scorePage(row, extractPageSignals(row)) }))
    scored.sort((a, b) => a.result.score - b.result.score)
    setPages(scored)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pageTypes = useMemo(() => Array.from(new Set(pages.map((p) => p.row.page_type ?? 'unknown'))).sort(), [pages])

  const summary = useMemo(() => {
    const total = pages.length
    const avgScore = total ? Math.round(pages.reduce((sum, p) => sum + p.result.score, 0) / total) : 0
    const grades: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0 }
    let noindex = 0, missingOg = 0, thinContent = 0, totalIssues = 0
    for (const { row, result } of pages) {
      grades[result.grade]++
      totalIssues += result.failCount + result.warnCount
      if (row.is_active === false || row.is_indexed === false) noindex++
      if (result.checks.some((c) => c.id === 'og_image' && c.status === 'fail')) missingOg++
      if (result.checks.some((c) => c.id === 'content_depth' && c.status === 'fail')) thinContent++
    }
    return { total, avgScore, grades, noindex, missingOg, thinContent, totalIssues }
  }, [pages])

  const perTypeAverage = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>()
    for (const { row, result } of pages) {
      const key = row.page_type ?? 'unknown'
      const entry = map.get(key) ?? { sum: 0, count: 0 }
      entry.sum += result.score
      entry.count += 1
      map.set(key, entry)
    }
    return Array.from(map.entries())
      .map(([type, { sum, count }]) => ({ type, avg: Math.round(sum / count), count }))
      .sort((a, b) => a.avg - b.avg)
  }, [pages])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return pages.filter(({ row, result }) => {
      if (pageTypeFilter !== 'all' && row.page_type !== pageTypeFilter) return false
      if (gradeFilter !== 'all' && result.grade !== gradeFilter) return false
      if (term && !(row.url_path ?? '').toLowerCase().includes(term) && !(row.meta_title ?? '').toLowerCase().includes(term)) return false
      return true
    })
  }, [pages, pageTypeFilter, gradeFilter, query])

  const exportCsv = () => {
    const header = ['url_path', 'page_type', 'score', 'grade', 'fail_count', 'warn_count', 'failing_checks']
    const rows = filtered.map(({ row, result }) => [
      row.url_path ?? '',
      row.page_type ?? '',
      String(result.score),
      result.grade,
      String(result.failCount),
      String(result.warnCount),
      result.checks.filter((c) => c.status !== 'pass').map((c) => c.label).join('; '),
    ])
    const csv = [header, ...rows].map((r) => r.map((v) => csvEscape(v)).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seo-health-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={exportCsv} disabled={loading || filtered.length === 0} className="admin-btn-secondary">
          <Download className="w-4 h-4" /> Export CSV
        </button>
        <button onClick={load} disabled={loading} className="admin-btn-secondary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Average score" value={summary.avgScore} />
        <StatCard label="Pages tracked" value={summary.total} />
        <StatCard label="Total issues (warn + fail)" value={summary.totalIssues} tone={summary.totalIssues > 0 ? 'warn' : 'ok'} />
        <StatCard label="Noindex / inactive" value={summary.noindex} tone={summary.noindex > 0 ? 'danger' : 'ok'} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="admin-card p-5">
          <p className="admin-section-title mb-4">Grade distribution</p>
          <div className="space-y-2.5">
            {(['A', 'B', 'C', 'D'] as Grade[]).map((g) => {
              const count = summary.grades[g]
              const pct = summary.total ? (count / summary.total) * 100 : 0
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className={clsx('w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold shrink-0', GRADE_STYLE[g])}>{g}</span>
                  <div className="flex-1 h-2 rounded-full bg-[#0f1117] overflow-hidden">
                    <div className={clsx('h-full rounded-full', g === 'A' ? 'bg-emerald-500' : g === 'B' ? 'bg-blue-500' : g === 'C' ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-[#9ca3af] w-10 text-right tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="admin-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="admin-section-title">Cleanup signals</p>
            <ImageOff className="w-4 h-4 text-[#6b7280]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-4">
              <p className="text-2xl font-extrabold text-white">{summary.missingOg}</p>
              <p className="text-xs text-[#6b7280] mt-1">Missing OG image</p>
            </div>
            <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] p-4">
              <p className="text-2xl font-extrabold text-white">{summary.thinContent}</p>
              <p className="text-xs text-[#6b7280] mt-1">Thin content (&lt;300 words)</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {perTypeAverage.map(({ type, avg, count }) => (
              <div key={type} className="flex items-center justify-between text-xs bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-1.5">
                <span className="text-[#cbd5e1]">{PAGE_TYPE_LABEL[type] ?? type}</span>
                <span className="text-[#9ca3af]">{avg} avg · {count} pages</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search URL or title…" className="admin-input pl-9" />
        </div>
        <select value={pageTypeFilter} onChange={(e) => setPageTypeFilter(e.target.value)} className="admin-input w-auto text-sm">
          <option value="all">All page types</option>
          {pageTypes.map((t) => <option key={t} value={t}>{PAGE_TYPE_LABEL[t] ?? t}</option>)}
        </select>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as 'all' | Grade)} className="admin-input w-auto text-sm">
          <option value="all">All grades</option>
          {(['A', 'B', 'C', 'D'] as Grade[]).map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <span className="text-xs text-[#6b7280]">{filtered.length} of {pages.length} pages · worst score first</span>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#94a3b8] px-5 py-8 text-center">No pages match these filters.</p>
        ) : (
          <div className="divide-y divide-[#2a2d3e]">
            {filtered.map(({ row, result }) => {
              const expanded = expandedId === row.id
              const editorHref = resolveEditorHref(row)
              const topIssues = result.checks.filter((c) => c.status !== 'pass').slice(0, 3)
              return (
                <div key={row.id}>
                  <button onClick={() => setExpandedId(expanded ? null : row.id)} className="w-full text-left px-5 py-4 hover:bg-[#1a1d27] transition-colors flex items-center gap-4">
                    <span className={clsx('w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border text-sm font-bold', GRADE_STYLE[result.grade])}>{result.grade}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white truncate">{row.url_path || '(no path)'}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#2a2d3e] text-[#9ca3af] shrink-0">{PAGE_TYPE_LABEL[row.page_type ?? ''] ?? row.page_type}</span>
                        {(row.is_active === false || row.is_indexed === false) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 shrink-0">noindex</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {topIssues.map((c) => (
                          <span key={c.id} className="text-[11px] text-[#9ca3af] flex items-center gap-1">{STATUS_ICON[c.status]}{c.label}</span>
                        ))}
                        {topIssues.length === 0 && <span className="text-[11px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />No issues</span>}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-white tabular-nums shrink-0">{result.score}</span>
                    {editorHref && (
                      <Link href={editorHref} onClick={(e) => e.stopPropagation()} className="admin-btn-secondary text-xs shrink-0">
                        Fix
                      </Link>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-[#6b7280] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#6b7280] shrink-0" />}
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 bg-[#0f1117]">
                      <div className="grid sm:grid-cols-2 gap-2 pt-4">
                        {result.checks.map((c) => (
                          <div key={c.id} className="flex items-start gap-2 rounded-lg border border-[#2a2d3e] bg-[#1a1d27] px-3 py-2">
                            {STATUS_ICON[c.status]}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[#e2e8f0]">{c.label}</p>
                              <p className="text-[11px] text-[#6b7280] mt-0.5">{c.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

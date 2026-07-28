'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eraser, Loader2, RefreshCw, RouteOff } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import {
  createRedirect,
  deleteBrokenLink,
  listActivePublicRoutes,
  listBrokenLinks,
  pruneOldBrokenLinkHits,
  reopenBrokenLink,
  resolveBrokenLink,
} from '@/lib/actions'
import { RedirectFormModal } from '@/components/redirects/RedirectFormModal'
import type { RedirectFormState } from '@/components/redirects/types'
import { suggestRedirectTargets, type RouteCandidate } from '@/utils/links/suggestRedirects'
import { BrokenLinksTable } from './BrokenLinksTable'
import { BrokenLinkHitsDrawer } from './BrokenLinkHitsDrawer'
import type { BrokenLinkRecord } from './types'

export function BrokenLinksPanel() {
  const [rows, setRows] = useState<BrokenLinkRecord[]>([])
  const [routes, setRoutes] = useState<RouteCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pruning, setPruning] = useState(false)

  const [redirectTarget, setRedirectTarget] = useState<BrokenLinkRecord | null>(null)
  const [redirectDestination, setRedirectDestination] = useState('')
  const [hitsPath, setHitsPath] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [linksResult, routesResult] = await Promise.all([
      listBrokenLinks(),
      listActivePublicRoutes(),
    ])
    setLoading(false)

    if (!linksResult.success) {
      showToast('error', linksResult.error)
    } else {
      setRows(linksResult.rows)
    }

    if (routesResult.success) {
      setRoutes(routesResult.routes)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const suggestionsByPath = useMemo(() => {
    if (routes.length === 0) return {}
    const map: Record<string, string[]> = {}
    for (const row of rows) {
      if (row.is_resolved) continue
      map[row.path] = suggestRedirectTargets(row.path, routes, 3)
    }
    return map
  }, [rows, routes])

  const stats = useMemo(() => {
    const open = rows.filter((r) => !r.is_resolved).length
    const resolved = rows.length - open
    const totalHits = rows.reduce((sum, r) => sum + r.hit_count, 0)
    return { total: rows.length, open, resolved, totalHits }
  }, [rows])

  const handleCreateRedirect = (row: BrokenLinkRecord, destination: string) => {
    setRedirectTarget(row)
    setRedirectDestination(destination)
  }

  const submitRedirect = async (form: RedirectFormState) => {
    if (!redirectTarget) return
    setSaving(true)
    const result = await createRedirect(form)
    if (!result.success) {
      setSaving(false)
      showToast('error', result.error)
      return
    }
    const resolveResult = await resolveBrokenLink(redirectTarget.path)
    setSaving(false)
    setRedirectTarget(null)
    if (!resolveResult.success) {
      showToast('error', resolveResult.error)
    } else {
      showToast('success', 'Redirect created and broken link resolved.')
    }
    await load()
  }

  const handleResolve = async (row: BrokenLinkRecord) => {
    const result = await resolveBrokenLink(row.path)
    if (!result.success) { showToast('error', result.error); return }
    showToast('success', result.message)
    await load()
  }

  const handleReopen = async (row: BrokenLinkRecord) => {
    const result = await reopenBrokenLink(row.path)
    if (!result.success) { showToast('error', result.error); return }
    showToast('success', result.message)
    await load()
  }

  const handleDelete = async (row: BrokenLinkRecord) => {
    if (!confirm(`Remove "${row.path}" from the broken-links list?`)) return
    const result = await deleteBrokenLink(row.path)
    if (!result.success) { showToast('error', result.error); return }
    showToast('success', result.message)
    await load()
  }

  const handlePrune = async () => {
    if (!confirm('Delete raw hit records older than 90 days? Hit counts and paths themselves are kept — only the detailed IP/referrer history is pruned.')) return
    setPruning(true)
    const result = await pruneOldBrokenLinkHits(90)
    setPruning(false)
    if (!result.success) { showToast('error', result.error); return }
    showToast('success', result.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <RouteOff className="h-5 w-5 text-blue-400" />
            Broken Links
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#94a3b8]">
            Real 404s hit by real visitors on the live site, with suggested redirect destinations.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrune} className="admin-btn-secondary" disabled={pruning}>
            {pruning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
            Prune old hits
          </button>
          <button onClick={load} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.open}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">Open</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-green-400">{stats.resolved}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">Resolved</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">Unique Paths</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.totalHits}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">Total Hits</p>
        </div>
      </div>

      <BrokenLinksTable
        rows={rows}
        loading={loading}
        suggestionsByPath={suggestionsByPath}
        onCreateRedirect={handleCreateRedirect}
        onResolve={handleResolve}
        onReopen={handleReopen}
        onDelete={handleDelete}
        onViewHits={(row) => setHitsPath(row.path)}
      />

      <RedirectFormModal
        open={redirectTarget !== null}
        mode="create"
        redirect={null}
        initialValues={{
          source: redirectTarget?.path ?? '',
          destination: redirectDestination,
          is_permanent: true,
          is_active: true,
          note: 'Auto-created from detected 404',
        }}
        saving={saving}
        onClose={() => { if (!saving) setRedirectTarget(null) }}
        onSubmit={submitRedirect}
      />

      {hitsPath && (
        <BrokenLinkHitsDrawer path={hitsPath} onClose={() => setHitsPath(null)} />
      )}
    </div>
  )
}

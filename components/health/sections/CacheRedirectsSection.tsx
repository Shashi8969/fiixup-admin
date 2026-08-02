'use client'
// components/health/sections/CacheRedirectsSection.tsx
// Manual cache control + redirect diagnostics. Clearing here goes through
// the same secret-authenticated /api/revalidate endpoint every other admin
// save already uses (lib/actions.ts's clearAllCache/clearCacheByTag).
//
// Redirects specifically: the live site's redirect proxy (proxy.ts) refreshes
// its own in-memory table on a short TTL (REDIRECT_CACHE_TTL_SECONDS, 60s
// floor) rather than being clearable on demand from here — it runs in a
// separate runtime from this admin app and from the revalidate endpoint, so
// there's no reliable way to force it instantly. The tester/chain-report
// below read the redirects table directly, so they always reflect what will
// go live within that window, not what's cached right now.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { clearAllCache, clearCacheByTag, type ClearableTag } from '@/lib/actions'
import { StatCard } from '@/components/health/StatCard'
import {
  buildRedirectIndex,
  findChains,
  resolvePath,
  type RedirectRow,
  type ResolveResult,
} from '@/utils/redirects/resolve'

const TAG_GROUPS: { label: string; tags: ClearableTag[] }[] = [
  { label: 'Cities & Locations', tags: ['cities', 'areas', 'location-services'] },
  { label: 'Services', tags: ['services', 'service-categories'] },
  { label: 'Content', tags: ['posts', 'homepage', 'seo-pages'] },
  { label: 'Site-wide', tags: ['site-settings', 'navigation-links', 'redirects'] },
  { label: 'Media & Trust', tags: ['brand-logos', 'gallery', 'team-members', 'reviews'] },
]

export function CacheRedirectsSection() {
  const sb = getBrowserClient()
  const [rows, setRows] = useState<RedirectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [clearingAll, setClearingAll] = useState(false)
  const [clearingTag, setClearingTag] = useState<ClearableTag | null>(null)
  const [lastCleared, setLastCleared] = useState<string | null>(null)
  const [testPath, setTestPath] = useState('')
  const [testResult, setTestResult] = useState<ResolveResult | null>(null)

  const loadRedirects = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('redirects')
      .select('id,source,destination,is_permanent')
      .eq('is_active', true)
      .limit(5000)

    if (error) {
      showToast('error', error.message)
      setRows([])
    } else {
      setRows((data ?? []) as RedirectRow[])
    }
    setLoading(false)
  }, [sb])

  useEffect(() => {
    loadRedirects()
  }, [loadRedirects])

  const index = useMemo(() => buildRedirectIndex(rows), [rows])
  const chains = useMemo(() => findChains(index), [index])

  const runTest = () => {
    if (!testPath.trim()) return
    setTestResult(resolvePath(index, testPath.trim()))
  }

  const handleClearAll = async () => {
    setClearingAll(true)
    const result = await clearAllCache()
    setClearingAll(false)
    if (result.success) {
      setLastCleared(new Date().toLocaleTimeString('en-IN'))
      showToast('success', result.message ?? 'Cache cleared.')
    } else {
      showToast('error', result.error ?? 'Cache clear failed.')
    }
  }

  const handleClearTag = async (tag: ClearableTag) => {
    setClearingTag(tag)
    const result = await clearCacheByTag(tag)
    setClearingTag(null)
    if (result.success) {
      showToast('success', result.message ?? `${tag} cache cleared.`)
    } else {
      showToast('error', result.error ?? `Failed to clear ${tag}.`)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Manual cache clear ── */}
      <div className="admin-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Clear Live Site Cache</h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              For when you&apos;ve made an important change and want it live immediately, instead of
              waiting for the normal cache window. This clears the same cache every content save
              already triggers — nothing here is more destructive than a normal save.
            </p>
          </div>
          <button
            onClick={handleClearAll}
            disabled={clearingAll}
            className="admin-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
          >
            {clearingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Clear All Cache
          </button>
        </div>
        {lastCleared && (
          <p className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Cleared at {lastCleared}
          </p>
        )}

        <div className="border-t border-[#2a2d3e] pt-4">
          <p className="mb-3 text-xs text-[#6b7280]">
            Or clear just one section — faster, and avoids a brief cold-cache moment for the rest of
            the site.
          </p>
          <div className="space-y-3">
            {TAG_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleClearTag(tag)}
                      disabled={clearingTag === tag}
                      className="admin-btn-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-60"
                    >
                      {clearingTag === tag ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Redirect stats ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active Redirects" value={loading ? '—' : rows.length} icon={Link2} />
        <StatCard
          label="Chains / Cycles"
          value={loading ? '—' : chains.length}
          icon={AlertTriangle}
          tone={chains.length > 0 ? 'warn' : 'ok'}
          helper={chains.length > 0 ? 'Needs flattening' : 'None found'}
        />
        <StatCard label="Redirect cache window" value="~60s" helper="REDIRECT_CACHE_TTL_SECONDS" />
        <button onClick={loadRedirects} className="admin-card flex items-center justify-center gap-2 p-4 text-sm text-[#94a3b8] hover:text-white">
          <RefreshCw className="h-4 w-4" /> Refresh list
        </button>
      </div>

      {/* ── URL tester ── */}
      <div className="admin-card space-y-3 p-5">
        <h2 className="font-semibold text-white">Test a URL</h2>
        <p className="text-xs text-[#6b7280]">
          Paste a path (e.g. <code className="text-blue-400">/bangalore/roadside-assistance-bangalore</code>)
          to see exactly how it resolves, including every hop, using the current redirects table.
        </p>
        <div className="flex gap-2">
          <input
            value={testPath}
            onChange={(e) => setTestPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runTest()}
            placeholder="/some/path"
            className="admin-input flex-1"
          />
          <button onClick={runTest} className="admin-btn-primary inline-flex items-center gap-2">
            <Search className="h-4 w-4" /> Resolve
          </button>
        </div>
        {testResult && (
          <div className="rounded-xl border border-[#2a2d3e] bg-[#0f1117] p-4 text-sm">
            {testResult.hops.length === 0 ? (
              <p className="text-[#94a3b8]">No redirect rule matches this path — it serves directly (or 404s).</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[#e2e8f0]">
                  {testResult.hops.map((hop, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <code className="text-blue-400">{hop.from}</code>
                      <span className="text-[#475569]">→ ({hop.permanent ? '301' : '302'}) →</span>
                      {i === testResult.hops.length - 1 && (
                        <code className="text-green-400">{hop.to}</code>
                      )}
                    </span>
                  ))}
                </div>
                {testResult.isCycle && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Circular redirect — this will loop until the browser gives up.
                  </p>
                )}
                {testResult.isChain && !testResult.isCycle && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> {testResult.hops.length} hops — consider flattening to a single redirect.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Chain report ── */}
      <div className="admin-card space-y-3 p-5">
        <h2 className="font-semibold text-white">Redirect Chains &amp; Cycles</h2>
        <p className="text-xs text-[#6b7280]">
          Any redirect whose destination is itself the source of another active redirect — each
          extra hop is a small SEO/latency cost worth flattening to point straight at the final URL.
        </p>
        {loading ? (
          <p className="py-6 text-center text-sm text-[#6b7280]">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading…
          </p>
        ) : chains.length === 0 ? (
          <p className="flex items-center gap-1.5 py-4 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" /> No chains found — every active redirect goes straight to its final destination.
          </p>
        ) : (
          <div className="space-y-2">
            {chains.map((chain) => (
              <div key={chain.source} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 text-[#e2e8f0]">
                  {chain.hops.map((hop, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <code className={i === 0 ? 'text-blue-400' : 'text-[#94a3b8]'}>{hop.from}</code>
                      <span className="text-[#475569]">→</span>
                      {i === chain.hops.length - 1 && <code className="text-green-400">{hop.to}</code>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

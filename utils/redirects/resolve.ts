// utils/redirects/resolve.ts
// Pure, self-contained redirect resolution logic mirroring fiixup_nextjs's
// proxy.ts matching rules (exact-first, then longest-wildcard-prefix), used
// by the admin's Cache & Redirects tab for the URL tester and chain report.
// Kept independent of the public site's runtime — this queries the same
// `redirects` table directly rather than calling into proxy.ts, which runs
// in a separate app/runtime entirely.

export type RedirectRow = {
  id?: string
  source: string
  destination: string
  is_permanent: boolean
}

export type RedirectIndex = {
  exact: Map<string, RedirectRow>
  wildcard: { prefix: string; row: RedirectRow }[]
}

function stripTrailingSlash(path: string) {
  if (!path || path === '/') return '/'
  return path.replace(/\/+$/, '') || '/'
}

export function normalizeSourcePath(value: string) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return stripTrailingSlash(new URL(trimmed).pathname).toLowerCase()
    }
  } catch {
    return ''
  }
  const pathOnly = trimmed.split('?')[0].split('#')[0]
  const withSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  return stripTrailingSlash(withSlash).toLowerCase()
}

function isWildcardSource(source: string) {
  return source.includes(':path*') || source.includes('*')
}

function getWildcardPrefix(source: string) {
  const normalized = normalizeSourcePath(source)
  if (!normalized) return ''
  if (normalized.includes(':path*')) return stripTrailingSlash(normalized.split(':path*')[0])
  if (normalized.includes('*')) return stripTrailingSlash(normalized.split('*')[0])
  return ''
}

export function buildRedirectIndex(rows: RedirectRow[]): RedirectIndex {
  const exact = new Map<string, RedirectRow>()
  const wildcard: { prefix: string; row: RedirectRow }[] = []

  for (const row of rows) {
    if (!row?.source || !row?.destination) continue
    if (isWildcardSource(row.source)) {
      const prefix = getWildcardPrefix(row.source)
      if (prefix) wildcard.push({ prefix, row })
      continue
    }
    const source = normalizeSourcePath(row.source)
    if (source) exact.set(source, row)
  }

  wildcard.sort((a, b) => b.prefix.length - a.prefix.length)
  return { exact, wildcard }
}

function findOneHop(index: RedirectIndex, path: string): RedirectRow | null {
  const normalized = normalizeSourcePath(path)
  const exact = index.exact.get(normalized)
  if (exact) return exact
  for (const { prefix, row } of index.wildcard) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) return row
  }
  return null
}

export type ResolveHop = { from: string; to: string; permanent: boolean }
export type ResolveResult = {
  hops: ResolveHop[]
  finalDestination: string | null
  isChain: boolean
  isCycle: boolean
}

/** Follows the full redirect chain for a path, the way a browser would. */
export function resolvePath(index: RedirectIndex, inputPath: string, maxHops = 10): ResolveResult {
  const hops: ResolveHop[] = []
  const seen = new Set<string>()
  let current = normalizeSourcePath(inputPath)

  for (let i = 0; i < maxHops; i++) {
    if (seen.has(current)) {
      return { hops, finalDestination: null, isChain: hops.length > 0, isCycle: true }
    }
    seen.add(current)

    const rule = findOneHop(index, current)
    if (!rule) break

    const destPath = rule.destination.startsWith('http')
      ? normalizeSourcePath(rule.destination)
      : normalizeSourcePath(rule.destination)
    hops.push({ from: current, to: rule.destination, permanent: Boolean(rule.is_permanent) })
    current = destPath
  }

  return {
    hops,
    finalDestination: hops.length > 0 ? hops[hops.length - 1].to : null,
    isChain: hops.length > 1,
    isCycle: false,
  }
}

/** Finds every exact-match row whose destination is itself the source of another active rule. */
export function findChains(index: RedirectIndex): { source: string; hops: ResolveHop[] }[] {
  const chains: { source: string; hops: ResolveHop[] }[] = []
  for (const [source] of index.exact) {
    const result = resolvePath(index, source)
    if (result.isChain || result.isCycle) {
      chains.push({ source, hops: result.hops })
    }
  }
  return chains
}

// lib/supabase.ts
// Browser client ONLY — safe to import in 'use client' components
// Does NOT import next/headers — no Server Component restriction

import { createBrowserClient } from '@supabase/ssr'
import { createClient }        from '@supabase/supabase-js'

// ── Browser client (Client Components) ───────────────────────────────────────
// Used in all 'use client' pages to read data directly from Supabase.
// Memoized as a singleton: constructing a fresh client per call (as this used
// to do) means each new instance has to re-read/recover its session from
// cookies before the auth header is attached to its first request. A modal
// that calls getBrowserClient() the moment it opens and immediately fires a
// storage upload can lose that race — the upload goes out looking anonymous
// even with a fully valid session, which Storage's RLS then rejects. Reusing
// one already-hydrated instance avoids the race entirely.
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

// ── Service role client (Server Actions / lib/actions.ts only) ────────────────
// Bypasses RLS — never call from client components
// Only imported in lib/actions.ts which is 'use server'
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

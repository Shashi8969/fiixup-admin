// lib/supabase.ts
// Browser client ONLY — safe to import in 'use client' components
// Does NOT import next/headers — no Server Component restriction

import { createBrowserClient } from '@supabase/ssr'
import { createClient }        from '@supabase/supabase-js'

// ── Browser client (Client Components) ───────────────────────────────────────
// Used in all 'use client' pages to read data directly from Supabase
export function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
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

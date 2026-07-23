// lib/validation.ts
// Shared write-path guard for Server Actions in lib/actions.ts.
//
// Every editor in this app sends a free-form `Record<string, unknown>` blob
// straight through to a service-role Supabase client (which bypasses RLS).
// sanitizeWriteData() is the choke point that runs before any of that data
// reaches `.update()`/`.insert()`: it strips fields a client should never be
// able to set directly (primary keys, timestamps) and blocks prototype-
// pollution keys, so a compromised/malicious client can't smuggle extra
// columns or objects into a write it wasn't meant to make.

import { z } from 'zod'

const PROTECTED_KEYS = new Set([
  'id', 'created_at', 'updated_at', '__proto__', 'constructor', 'prototype',
])

const MAX_STRING_LENGTH = 100_000

const writeDataSchema = z.record(z.string(), z.unknown())

export function sanitizeWriteData<T extends Record<string, unknown>>(input: T): Partial<T> {
  const parsed = writeDataSchema.parse(input ?? {})
  const out: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(parsed)) {
    if (PROTECTED_KEYS.has(key)) continue
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) continue
    if (typeof value === 'function') continue
    out[key] = value
  }

  return out as Partial<T>
}

'use server'
// lib/auth-actions.ts
// Server-only admin registration. The invite secret is read from a
// non-NEXT_PUBLIC env var, so it is never compiled into the browser bundle,
// and the account itself is created here via the service-role admin API —
// never via a client-side supabase.auth.signUp() call, which would let
// anyone bypass the invite check entirely.

import { getServiceClient } from './supabase'

export type RegisterResult =
  | { success: true; message: string }
  | { success: false; error: string }

// Best-effort in-memory rate limit. This app runs as a single long-lived
// Node process (see SETUP.md), so this persists across requests here —
// it would not on a multi-instance serverless deployment.
const registerAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = registerAttempts.get(key)
  if (!entry || now > entry.resetAt) {
    registerAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count += 1
  return true
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function registerAdminAccount(input: {
  fullName: string
  email: string
  password: string
  inviteCode: string
}): Promise<RegisterResult> {
  const fullName = (input.fullName ?? '').trim()
  const email = (input.email ?? '').trim().toLowerCase()
  const password = input.password ?? ''
  const inviteCode = input.inviteCode ?? ''

  if (!checkRateLimit(email || 'unknown')) {
    return { success: false, error: 'Too many attempts. Please try again later.' }
  }

  if (!fullName || fullName.length > 200) {
    return { success: false, error: 'Full name is required.' }
  }
  if (!EMAIL_RE.test(email)) {
    return { success: false, error: 'Enter a valid email address.' }
  }
  if (password.length < 8 || password.length > 200) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  const expected = process.env.ADMIN_INVITE_SECRET
  if (!expected) {
    return { success: false, error: 'Admin registration is not configured on the server.' }
  }
  if (inviteCode !== expected) {
    return { success: false, error: 'Invalid admin invite code. Ask the site owner for the code.' }
  }

  const sb = getServiceClient()
  const { error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (error) return { success: false, error: error.message }
  return { success: true, message: 'Account created. You can sign in now.' }
}

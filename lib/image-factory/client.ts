import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { getServerClient } from '@/lib/supabase-server'

export async function getImageFactoryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (url && serviceRole) {
    return createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  // Interactive admin requests can fall back to the signed-in user's RLS session.
  return getServerClient()
}

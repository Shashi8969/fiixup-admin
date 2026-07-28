export type BrokenLinkRecord = {
  path: string
  hit_count: number
  first_seen_at: string
  last_seen_at: string
  is_resolved: boolean
  resolved_at: string | null
  suggested_redirect_to: string | null
  notes: string | null
}

export type BrokenLinkHitRecord = {
  id: string
  path: string
  ip_address: string | null
  referrer: string | null
  user_agent: string | null
  created_at: string
}

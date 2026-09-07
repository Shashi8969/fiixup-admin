// utils/publishing/schedule.ts
// Shared vocabulary for scheduled publishing, used by the editor UI and by the
// schedulePost server action.
//
// Everything the editor shows is India Standard Time. IST is a fixed UTC+05:30
// with no daylight saving, so a constant offset is exact here — which lets the
// picker mean the same wall-clock time whatever timezone the admin's laptop
// happens to be set to. Do not reuse this trick for a zone that observes DST.

export const POST_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const
export type PostStatus = (typeof POST_STATUSES)[number]

export const IST_OFFSET_MINUTES = 330
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60_000

export function isPostStatus(value: unknown): value is PostStatus {
  return typeof value === 'string' && (POST_STATUSES as readonly string[]).includes(value)
}

/** UTC instant → the `YYYY-MM-DDTHH:mm` string an <input type="datetime-local"> wants, in IST. */
export function utcIsoToIstInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16)
}

/** `YYYY-MM-DDTHH:mm` read as an IST wall clock → the UTC instant to store. */
export function istInputToUtcIso(input: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input.trim())
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  const asIfUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  if (!Number.isFinite(asIfUtc)) return null
  return new Date(asIfUtc - IST_OFFSET_MS).toISOString()
}

/** A UTC instant rendered for a human, e.g. "10 Sep 2026, 08:00 IST". */
export function formatIst(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return '—'
  const ist = new Date(ms + IST_OFFSET_MS)
  const date = ist.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
  const time = ist.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  })
  return `${date}, ${time} IST`
}

/** "in 2 days", "in 3 hours", "in 12 minutes", or "overdue" once the moment has passed. */
export function countdownLabel(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return ''
  const target = new Date(iso).getTime()
  if (!Number.isFinite(target)) return ''

  const diffMs = target - now
  if (diffMs <= 0) return 'due now — publishing on the next minute tick'

  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`

  const hours = Math.round(minutes / 60)
  if (hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`

  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

/**
 * Display strings for `posts.date` / `posts.date_proper`, derived from the
 * publish instant so a scheduled post's byline and JSON-LD datePublished match
 * the day it actually goes live rather than the day it was drafted.
 */
export function displayDatesFromUtcIso(iso: string): { date: string; date_proper: string } | null {
  const ms = new Date(iso).getTime()
  if (!Number.isFinite(ms)) return null
  const ist = new Date(ms + IST_OFFSET_MS)
  return {
    date: ist.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }),
    date_proper: ist.toISOString().slice(0, 10),
  }
}

/** Mirrors fn_content_is_live() in Postgres and isLive() on the public site. */
export function isLiveNow(status: string | null | undefined, publishAt: string | null | undefined): boolean {
  const value = status ?? 'published'
  if (value === 'published') return true
  if (value !== 'scheduled' || !publishAt) return false
  const ms = new Date(publishAt).getTime()
  return Number.isFinite(ms) && ms <= Date.now()
}

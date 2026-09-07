'use client'
// components/posts/editor/PublishingCard.tsx
// Publishing state for a blog post: draft, scheduled, or live.
//
// Scheduling here is a database fact, not a browser one. Once saved, the
// publish-scheduled-content pg_cron job inside Supabase flips the post to
// published at the chosen minute and busts the live site's ISR cache — so it
// goes live on time with this tab closed, the laptop shut, and nobody online.

import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { CalendarClock, CheckCircle2, Clock, FileEdit, Loader2, Send } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { schedulePost } from '@/lib/actions'
import {
  countdownLabel,
  formatIst,
  istInputToUtcIso,
  utcIsoToIstInput,
  type PostStatus,
} from '@/utils/publishing/schedule'

const CHOICES: { value: PostStatus; label: string; hint: string; icon: typeof Clock }[] = [
  { value: 'draft',     label: 'Draft',     hint: 'Hidden from the site and the sitemap', icon: FileEdit },
  { value: 'scheduled', label: 'Scheduled', hint: 'Goes live on its own at the time you pick', icon: CalendarClock },
  { value: 'published', label: 'Published', hint: 'Live right now', icon: CheckCircle2 },
]

/** Default suggestion when scheduling: tomorrow 08:00 IST, in the picker's format. */
function defaultSlot(): string {
  const tomorrow8amIst = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return `${utcIsoToIstInput(tomorrow8amIst.toISOString()).slice(0, 10)}T08:00`
}

export function PublishingCard({ post, onSaved }: {
  post: Record<string, unknown>
  onSaved: (patch: Record<string, unknown>) => void
}) {
  const savedStatus = (typeof post.status === 'string' ? post.status : 'published') as PostStatus
  const savedPublishAt = typeof post.publish_at === 'string' ? post.publish_at : null

  const [status, setStatus] = useState<PostStatus>(savedStatus)
  const [slot, setSlot] = useState(() => utcIsoToIstInput(savedPublishAt) || defaultSlot())
  const [syncDisplayDate, setSyncDisplayDate] = useState(true)
  const [saving, setSaving] = useState<'schedule' | 'now' | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Keeps "in 3 hours" honest while the editor sits open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setStatus(savedStatus)
    setSlot(utcIsoToIstInput(savedPublishAt) || defaultSlot())
  }, [savedStatus, savedPublishAt])

  const archived = savedStatus === 'archived'
  const countdown = useMemo(
    () => (savedStatus === 'scheduled' ? countdownLabel(savedPublishAt, now) : ''),
    [savedStatus, savedPublishAt, now]
  )

  const commit = async (
    kind: 'schedule' | 'now',
    next: PostStatus,
    publishAt: string | null
  ) => {
    setSaving(kind)
    const result = await schedulePost(String(post.id), String(post.slug), {
      status: next,
      publishAt,
      syncDisplayDate,
    })
    setSaving(null)

    if (!result.success) {
      showToast('error', result.error ?? 'Could not update publishing')
      return
    }
    showToast('success', result.message)
    onSaved({ status: next, publish_at: publishAt })
  }

  const apply = () => {
    if (status === 'scheduled') {
      const iso = istInputToUtcIso(slot)
      if (!iso) {
        showToast('error', 'Pick a valid date and time first')
        return
      }
      void commit('schedule', 'scheduled', iso)
      return
    }
    void commit('schedule', status, status === 'published' ? new Date().toISOString() : null)
  }

  const dirty =
    status !== savedStatus ||
    (status === 'scheduled' && istInputToUtcIso(slot) !== savedPublishAt)

  return (
    <div className="admin-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Publishing
          </h2>
          <p className="text-xs text-[#6b7280] mt-1">
            Scheduled posts publish themselves from the database — no browser, no login, no internet on your side.
          </p>
        </div>
        <StatusPill status={savedStatus} publishAt={savedPublishAt} countdown={countdown} />
      </div>

      {archived && (
        <p className="text-xs text-yellow-400 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          This post is archived and hidden from the site. Choose Published or Scheduled to bring it back.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {CHOICES.map(({ value, label, hint, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            aria-pressed={status === value}
            className={clsx(
              'text-left p-3 rounded-xl border transition-colors',
              status === value
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[#2a2d3e] bg-[#0f1117] hover:border-[#3a3d4e]'
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
              <Icon className={clsx('w-4 h-4', status === value ? 'text-blue-400' : 'text-[#6b7280]')} />
              {label}
            </span>
            <span className="block text-[11px] text-[#6b7280] mt-1 leading-snug">{hint}</span>
          </button>
        ))}
      </div>

      {status === 'scheduled' && (
        <div className="space-y-3 p-4 bg-[#0f1117] border border-[#2a2d3e] rounded-xl">
          <div>
            <label className="admin-label" htmlFor="publish-at">Publish at (IST)</label>
            <input
              id="publish-at"
              type="datetime-local"
              value={slot}
              onChange={(event) => setSlot(event.target.value)}
              className="admin-input"
            />
            <p className="text-xs text-[#6b7280] mt-1.5">
              {istInputToUtcIso(slot)
                ? `${formatIst(istInputToUtcIso(slot))} · ${countdownLabel(istInputToUtcIso(slot), now)}`
                : 'Enter a date and time.'}
            </p>
          </div>

          <label className="flex items-start gap-2 text-xs text-[#94a3b8] cursor-pointer">
            <input
              type="checkbox"
              checked={syncDisplayDate}
              onChange={(event) => setSyncDisplayDate(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Set the post&apos;s display date to match, so the byline and structured data
              show the day it goes live instead of the day it was written.
            </span>
          </label>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={apply} disabled={saving !== null || !dirty} className="admin-btn-primary">
          {saving === 'schedule' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
          {status === 'scheduled' ? 'Save schedule' : `Set to ${status}`}
        </button>

        {savedStatus !== 'published' && (
          <button
            onClick={() => void commit('now', 'published', new Date().toISOString())}
            disabled={saving !== null}
            className="admin-btn-secondary"
          >
            {saving === 'now' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish now
          </button>
        )}

        {!dirty && saving === null && (
          <span className="text-xs text-[#6b7280]">No unsaved changes</span>
        )}
      </div>
    </div>
  )
}

/**
 * `compact` drops the date and countdown, for places (the posts list) where the
 * row already spells the schedule out and the pill only needs to carry state.
 */
export function StatusPill({ status, publishAt, countdown, compact }: {
  status: string
  publishAt: string | null
  countdown?: string
  compact?: boolean
}) {
  const base = 'text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap flex-shrink-0'

  if (status === 'scheduled') {
    const detail = compact ? '' : ` · ${formatIst(publishAt)}${countdown ? ` · ${countdown}` : ''}`
    return (
      <span className={`${base} bg-purple-500/10 text-purple-300 border-purple-500/20`}>
        Scheduled{detail}
      </span>
    )
  }
  if (status === 'draft') {
    return (
      <span className={`${base} bg-[#2a2d3e] text-[#94a3b8] border-[#2a2d3e]`}>
        Draft{compact ? '' : ' · not on the site'}
      </span>
    )
  }
  if (status === 'archived') {
    return (
      <span className={`${base} bg-yellow-500/10 text-yellow-400 border-yellow-500/20`}>
        Archived
      </span>
    )
  }
  return (
    <span className={`${base} bg-green-500/10 text-green-400 border-green-500/20`}>
      Published
    </span>
  )
}

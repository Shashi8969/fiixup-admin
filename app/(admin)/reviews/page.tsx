'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import {
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { clsx } from 'clsx'

type ReviewRow = Record<string, unknown>

type ReviewForm = {
  author_name: string
  rating: string
  body: string
  vehicle: string
  location: string
  source: string
  external_id: string
  verified: boolean
}

const EMPTY_FORM: ReviewForm = {
  author_name: '',
  rating: '5',
  body: '',
  vehicle: '',
  location: '',
  source: 'google',
  external_id: '',
  verified: true,
}

function s(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function n(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function b(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  return fallback
}

function getReviewName(row: ReviewRow) {
  return s(row.author_name || row.name || row.customer_name || row.reviewer_name, 'Fiixup Customer')
}

function getReviewBody(row: ReviewRow) {
  return s(row.body || row.text || row.review_text || row.review || row.comment)
}

function getReviewSource(row: ReviewRow) {
  return s(row.source || row.source_name || row.platform || row.review_platform, 'google')
}

function toForm(row: ReviewRow): ReviewForm {
  return {
    author_name: getReviewName(row),
    rating: String(n(row.rating, 5)),
    body: getReviewBody(row),
    vehicle: s(row.vehicle || row.vehicle_type),
    location: s(row.location || row.area || row.area_name || row.city || row.city_name),
    source: getReviewSource(row),
    external_id: s(row.external_id || row.google_review_id),
    verified: b(row.verified, true),
  }
}

function toPayload(form: ReviewForm) {
  return {
    author_name: form.author_name.trim(),
    rating: Math.max(1, Math.min(5, Number(form.rating) || 5)),
    body: form.body.trim(),
    vehicle: form.vehicle.trim() || null,
    location: form.location.trim() || null,
    source: form.source.trim() || 'google',
    external_id: form.external_id.trim() || null,
    verified: Boolean(form.verified),
  }
}

function sourceBadgeClass(source: string) {
  const lower = source.toLowerCase()
  if (lower.includes('google')) return 'bg-green-500/10 text-green-300 border-green-500/20'
  if (lower.includes('justdial')) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
  return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
}

export default function ReviewsPage() {
  const sb = getBrowserClient()
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newReview, setNewReview] = useState<ReviewForm>({ ...EMPTY_FORM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ReviewForm>({ ...EMPTY_FORM })

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('review_sources')
      .select('*')
      .order('created_at', { ascending: false })

    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setReviews([])
      return
    }

    setReviews((data ?? []) as ReviewRow[])
  }, [sb])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const sources = useMemo(() => {
    const set = new Set<string>()
    reviews.forEach((review) => {
      const source = getReviewSource(review).trim()
      if (source) set.add(source)
    })
    return Array.from(set).sort((a, z) => a.localeCompare(z))
  }, [reviews])

  const filteredReviews = useMemo(() => {
    const term = query.trim().toLowerCase()
    return reviews.filter((review) => {
      const source = getReviewSource(review)
      if (sourceFilter !== 'all' && source !== sourceFilter) return false
      if (!term) return true
      const haystack = [
        getReviewName(review),
        getReviewBody(review),
        getReviewSource(review),
        s(review.vehicle || review.vehicle_type),
        s(review.location || review.area || review.city),
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [reviews, query, sourceFilter])

  const stats = useMemo(() => {
    const total = reviews.length
    const google = reviews.filter((review) => getReviewSource(review).toLowerCase().includes('google')).length
    const verified = reviews.filter((review) => b(review.verified, false)).length
    const avg = total
      ? (reviews.reduce((sum, review) => sum + n(review.rating, 5), 0) / total).toFixed(1)
      : '0.0'
    return { total, google, verified, avg }
  }, [reviews])

  const createReview = async () => {
    const payload = toPayload(newReview)

    if (!payload.author_name || !payload.body) {
      showToast('error', 'Author name and review text are required.')
      return
    }

    setSaving(true)
    const { error } = await sb.from('review_sources').insert(payload)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'Review added.')
    setNewReview({ ...EMPTY_FORM })
    setShowCreate(false)
    fetchReviews()
  }

  const startEdit = (review: ReviewRow) => {
    setEditingId(s(review.id))
    setEditForm(toForm(review))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ ...EMPTY_FORM })
  }

  const saveReview = async (review: ReviewRow) => {
    const payload = toPayload(editForm)

    if (!payload.author_name || !payload.body) {
      showToast('error', 'Author name and review text are required.')
      return
    }

    setSaving(true)
    const { error } = await sb
      .from('review_sources')
      .update(payload)
      .eq('id', review.id)
    setSaving(false)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'Review saved.')
    cancelEdit()
    fetchReviews()
  }

  const deleteReview = async (review: ReviewRow) => {
    if (!confirm('Delete this review source?')) return

    const { error } = await sb
      .from('review_sources')
      .delete()
      .eq('id', review.id)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'Review deleted.')
    fetchReviews()
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="admin-page-title flex items-center gap-2">
            <Star className="w-6 h-6 text-blue-400" />
            Review Library
          </h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-2xl">
            Manage real Fiixup customer reviews from Google Business Profile, manual sources, and other trusted platforms.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={fetchReviews} className="admin-btn-secondary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={() => setShowCreate((open) => !open)} className="admin-btn-primary">
            <Plus className="w-4 h-4" />
            Add Review
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Total Reviews</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.google}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Google Reviews</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.verified}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Verified</p>
        </div>
        <div className="admin-card p-4 text-center">
          <p className="text-2xl font-extrabold text-white">{stats.avg}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">Average Rating</p>
        </div>
      </div>

      {showCreate && (
        <div className="admin-card p-5 space-y-4 border-dashed">
          <div>
            <p className="text-sm font-semibold text-white">Add new review source</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Add only real reviews. Use “google” as source for Google Business Profile reviews.
            </p>
          </div>
          <ReviewFormFields form={newReview} setForm={setNewReview} />
          <div className="flex gap-2">
            <button onClick={createReview} disabled={saving} className="admin-btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Review
            </button>
            <button onClick={() => setShowCreate(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="admin-card p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, review, vehicle, location, or source…"
            className="admin-input pl-9"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
          className="admin-input md:w-48"
        >
          <option value="all">All sources</option>
          {sources.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="admin-card p-8 text-center">
          <Star className="w-8 h-8 text-[#4b5563] mx-auto mb-3" />
          <p className="text-sm text-[#94a3b8]">No review sources found.</p>
          <p className="text-xs text-[#6b7280] mt-1">Add your first real Google or customer review above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => {
            const reviewId = s(review.id)
            const source = getReviewSource(review)
            const editing = editingId === reviewId
            return (
              <div key={reviewId} className="admin-card p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-semibold text-[#e2e8f0]">{getReviewName(review)}</p>
                      <span className={clsx('text-[11px] px-2 py-0.5 rounded-full border font-semibold', sourceBadgeClass(source))}>
                        {source}
                      </span>
                      {b(review.verified, false) && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-green-500/10 text-green-300 border-green-500/20 font-semibold">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex gap-0.5 mb-3">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <Star
                          key={item}
                          className={clsx(
                            'w-4 h-4',
                            item <= n(review.rating, 5)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-[#334155]'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
                      {getReviewBody(review)}
                    </p>
                    <p className="text-xs text-[#6b7280] mt-3">
                      {[s(review.vehicle || review.vehicle_type), s(review.location || review.area || review.city)]
                        .filter(Boolean)
                        .join(' · ') || 'General Fiixup customer review'}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(review)} className="admin-btn-secondary">Edit</button>
                    <button onClick={() => deleteReview(review)} className="admin-btn-danger">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                {editing && (
                  <div className="border-t border-[#2a2d3e] pt-4 space-y-4">
                    <ReviewFormFields form={editForm} setForm={setEditForm} />
                    <div className="flex gap-2">
                      <button onClick={() => saveReview(review)} disabled={saving} className="admin-btn-primary">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Review
                      </button>
                      <button onClick={cancelEdit} className="admin-btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ReviewFormFields({ form, setForm }: {
  form: ReviewForm
  setForm: React.Dispatch<React.SetStateAction<ReviewForm>>
}) {
  const update = (key: keyof ReviewForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="admin-label">Author Name *</label>
        <input
          value={form.author_name}
          onChange={(event) => update('author_name', event.target.value)}
          className="admin-input"
          placeholder="Customer name"
        />
      </div>
      <div>
        <label className="admin-label">Rating *</label>
        <input
          type="number"
          min="1"
          max="5"
          value={form.rating}
          onChange={(event) => update('rating', event.target.value)}
          className="admin-input"
        />
      </div>
      <div className="md:col-span-2">
        <label className="admin-label">Review Text *</label>
        <textarea
          value={form.body}
          onChange={(event) => update('body', event.target.value)}
          rows={4}
          className="admin-textarea"
          placeholder="Paste the real customer review text"
        />
      </div>
      <div>
        <label className="admin-label">Vehicle / Context</label>
        <input
          value={form.vehicle}
          onChange={(event) => update('vehicle', event.target.value)}
          className="admin-input"
          placeholder="Car, bike, roadside assistance, etc."
        />
      </div>
      <div>
        <label className="admin-label">Location</label>
        <input
          value={form.location}
          onChange={(event) => update('location', event.target.value)}
          className="admin-input"
          placeholder="Bangalore, HSR Layout, Whitefield…"
        />
      </div>
      <div>
        <label className="admin-label">Source</label>
        <input
          value={form.source}
          onChange={(event) => update('source', event.target.value)}
          className="admin-input"
          placeholder="google, manual, justdial"
        />
      </div>
      <div>
        <label className="admin-label">External ID</label>
        <input
          value={form.external_id}
          onChange={(event) => update('external_id', event.target.value)}
          className="admin-input"
          placeholder="Optional review/platform ID"
        />
      </div>
      <label className="md:col-span-2 flex items-center gap-3 text-sm text-[#cbd5e1]">
        <input
          type="checkbox"
          checked={form.verified}
          onChange={(event) => update('verified', event.target.checked)}
          className="w-4 h-4 rounded border-[#334155] bg-[#0f1117]"
        />
        Verified real review
      </label>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  HelpCircle,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

type Row = Record<string, unknown>

function s(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function b(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase())
  return fallback
}

function normalize(value: unknown): string {
  return s(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function reviewName(row: Row): string {
  return s(row.author_name || row.name || row.customer_name || row.reviewer_name, 'Fiixup Customer')
}

function reviewBody(row: Row): string {
  return s(row.body || row.text || row.review_text || row.review || row.comment)
}

function reviewSource(row: Row): string {
  return s(row.source || row.source_name || row.platform || row.review_platform, 'google')
}

function reviewExternalId(row: Row): string {
  return s(row.external_id || row.google_review_id || row.id).trim()
}

function reviewContentKey(row: Row): string {
  return `${normalize(reviewName(row))}|${normalize(reviewBody(row))}`
}

export function GlobalReviewPicker({
  locationServiceId,
  existing,
  onRefresh,
}: {
  locationServiceId: string
  existing: Row[]
  onRefresh: () => void
}) {
  const sb = getBrowserClient()
  const [library, setLibrary] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')

  const loadLibrary = async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('review_sources')
      .select('*')
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) {
      showToast('error', error.message)
      setLibrary([])
      return
    }
    setLibrary((data ?? []) as Row[])
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  const sources = useMemo(() => {
    const values = new Set<string>()
    library.forEach((row) => values.add(reviewSource(row)))
    return Array.from(values).filter(Boolean).sort((a, z) => a.localeCompare(z))
  }, [library])

  const selectedExternalIds = useMemo(
    () => new Set(existing.map((row) => s(row.external_id).trim()).filter(Boolean)),
    [existing],
  )

  const selectedContentKeys = useMemo(
    () => new Set(existing.map((row) => reviewContentKey(row)).filter(Boolean)),
    [existing],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return library.filter((row) => {
      const source = reviewSource(row)
      if (sourceFilter !== 'all' && source !== sourceFilter) return false
      if (!term) return true

      return [
        reviewName(row),
        reviewBody(row),
        source,
        s(row.vehicle || row.vehicle_type),
        s(row.location || row.area || row.city),
      ].join(' ').toLowerCase().includes(term)
    })
  }, [library, query, sourceFilter])

  const isSelected = (review: Row) => {
    const externalId = reviewExternalId(review)
    return (
      (externalId && selectedExternalIds.has(externalId)) ||
      selectedContentKeys.has(reviewContentKey(review))
    )
  }

  const useReview = async (review: Row) => {
    const reviewId = s(review.id)
    const body = reviewBody(review).trim()
    if (!body) {
      showToast('error', 'This review has no review text.')
      return
    }
    if (isSelected(review)) {
      showToast('error', 'This review is already selected for this service.')
      return
    }

    setSavingId(reviewId)
    const payload = {
      location_service_id: locationServiceId,
      name: reviewName(review),
      area: s(review.location || review.area || review.city) || null,
      vehicle: s(review.vehicle || review.vehicle_type) || null,
      rating: Math.max(1, Math.min(5, n(review.rating, 5))),
      body,
      date_label: s(review.date_label || review.review_date || review.published_at) || null,
      source: reviewSource(review),
      external_id: reviewExternalId(review) || null,
      verified: b(review.verified, true),
      sort_order: existing.length + 1,
    }

    const { error } = await sb.from('ls_testimonials').insert(payload)
    setSavingId(null)

    if (error) {
      showToast('error', error.message)
      return
    }

    showToast('success', 'Review added to this service.')
    onRefresh()
  }

  const removeReview = async (review: Row) => {
    const rowId = s(review.id)
    if (!rowId) return
    if (!confirm(`Remove ${s(review.name, 'this review')} from this location service?`)) return

    setRemovingId(rowId)
    const { error } = await sb
      .from('ls_testimonials')
      .delete()
      .eq('id', rowId)
      .eq('location_service_id', locationServiceId)
    setRemovingId(null)

    if (error) {
      showToast('error', error.message)
      return
    }
    showToast('success', 'Review removed from this service.')
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="admin-card p-5 space-y-4">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" /> Selected Reviews
          </h2>
          <p className="text-xs text-[#6b7280] mt-1">
            Add multiple real reviews from the global library. Each selected review can be removed separately.
          </p>
        </div>

        {existing.length === 0 ? (
          <p className="text-sm text-[#6b7280] italic">No reviews selected for this service.</p>
        ) : (
          <div className="space-y-3">
            {existing.map((current, index) => {
              const rowId = s(current.id)
              return (
                <div key={rowId || `${reviewContentKey(current)}-${index}`} className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{s(current.name, 'Fiixup Customer')}</p>
                        <span className="text-xs rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-yellow-300">
                          {Math.max(1, Math.min(5, n(current.rating, 5)))}★
                        </span>
                        {b(current.verified, false) && (
                          <span className="text-xs rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-green-300">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-[#cbd5e1] mt-2">{s(current.body)}</p>
                      <p className="text-xs text-[#6b7280] mt-2">
                        {[s(current.vehicle), s(current.area), s(current.source)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeReview(current)}
                      disabled={removingId === rowId}
                      className="admin-btn-danger flex-shrink-0"
                    >
                      {removingId === rowId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="admin-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Choose from Global Review Library</h3>
            <p className="text-xs text-[#6b7280] mt-1">The original global reviews remain unchanged.</p>
          </div>
          <button onClick={loadLibrary} disabled={loading} className="admin-btn-secondary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search review, customer, location, vehicle…"
              className="admin-input pl-9"
            />
          </div>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="admin-input md:w-48">
            <option value="all">All sources</option>
            {sources.map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#6b7280] italic py-4">No matching reviews found.</p>
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((review) => {
              const rowId = s(review.id)
              const alreadyAdded = isSelected(review)
              return (
                <div key={rowId} className="rounded-xl border border-[#2a2d3e] bg-[#11131c] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{reviewName(review)}</p>
                        <span className="text-xs text-yellow-300">{Math.max(1, Math.min(5, n(review.rating, 5)))}★</span>
                        <span className="text-xs rounded-full bg-[#2a2d3e] px-2 py-0.5 text-[#94a3b8]">{reviewSource(review)}</span>
                      </div>
                      <p className="text-sm leading-6 text-[#cbd5e1] mt-2">{reviewBody(review)}</p>
                      <p className="text-xs text-[#6b7280] mt-2">
                        {[s(review.vehicle || review.vehicle_type), s(review.location || review.area || review.city)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button
                      onClick={() => useReview(review)}
                      disabled={alreadyAdded || savingId === rowId}
                      className={alreadyAdded ? 'admin-btn-secondary flex-shrink-0 opacity-60' : 'admin-btn-primary flex-shrink-0'}
                    >
                      {savingId === rowId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : alreadyAdded ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      {alreadyAdded ? 'Added' : 'Add Review'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type FaqScope = 'recommended' | 'all' | 'global' | 'service' | 'area'

export function FaqLibraryPicker({
  locationServiceId,
  serviceSlug,
  serviceCategory,
  citySlug,
  areaSlug,
  existing,
  onRefresh,
}: {
  locationServiceId: string
  serviceSlug: string
  serviceCategory: string
  citySlug: string
  areaSlug: string
  existing: Row[]
  onRefresh: () => void
}) {
  const sb = getBrowserClient()
  const [library, setLibrary] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<FaqScope>('recommended')
  const [showCustom, setShowCustom] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [creating, setCreating] = useState(false)

  const loadLibrary = async () => {
    setLoading(true)
    const { data, error } = await sb
      .from('faq_library')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) {
      showToast('error', error.message)
      setLibrary([])
      return
    }
    setLibrary((data ?? []) as Row[])
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  const existingQuestions = useMemo(
    () => new Set(existing.map((row) => normalize(row.question || row.q)).filter(Boolean)),
    [existing],
  )

  const matchesService = (faq: Row) => {
    const faqServiceSlug = normalize(faq.service_slug)
    const faqCategory = normalize(faq.service_category)
    return Boolean(
      (faqServiceSlug && faqServiceSlug === normalize(serviceSlug)) ||
      (faqCategory && faqCategory === normalize(serviceCategory))
    )
  }

  const matchesArea = (faq: Row) => {
    const faqCity = normalize(faq.city_slug)
    const faqArea = normalize(faq.area_slug)
    if (!faqCity && !faqArea) return false
    return (!faqCity || faqCity === normalize(citySlug)) && (!faqArea || faqArea === normalize(areaSlug))
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return library.filter((faq) => {
      const isGlobal = b(faq.is_global, false)
      const serviceMatch = matchesService(faq)
      const areaMatch = matchesArea(faq)

      if (scope === 'global' && !isGlobal) return false
      if (scope === 'service' && !serviceMatch) return false
      if (scope === 'area' && !areaMatch) return false
      if (scope === 'recommended' && !isGlobal && !serviceMatch && !areaMatch) return false

      if (!term) return true
      return [
        s(faq.question || faq.q),
        s(faq.answer || faq.a),
        s(faq.faq_type || faq.category),
        s(faq.service_slug),
        s(faq.service_category),
        s(faq.city_slug),
        s(faq.area_slug),
      ].join(' ').toLowerCase().includes(term)
    })
  }, [library, query, scope, serviceSlug, serviceCategory, citySlug, areaSlug])

  const addFaq = async (faq: Row) => {
    const faqId = s(faq.id)
    const faqQuestion = s(faq.question || faq.q).trim()
    const faqAnswer = s(faq.answer || faq.a).trim()

    if (!faqQuestion || !faqAnswer) {
      showToast('error', 'This library FAQ is missing its question or answer.')
      return
    }
    if (existingQuestions.has(normalize(faqQuestion))) {
      showToast('error', 'This FAQ is already added to the service.')
      return
    }

    setSavingId(faqId)
    const { error } = await sb.from('ls_faqs').insert({
      location_service_id: locationServiceId,
      question: faqQuestion,
      answer: faqAnswer,
      sort_order: existing.length + 1,
    })
    setSavingId(null)

    if (error) {
      showToast('error', error.message)
      return
    }
    showToast('success', 'FAQ added from the global library.')
    onRefresh()
  }

  const createSpecificFaq = async () => {
    const cleanQuestion = question.trim()
    const cleanAnswer = answer.trim()
    if (!cleanQuestion || !cleanAnswer) {
      showToast('error', 'Question and answer are required.')
      return
    }
    if (existingQuestions.has(normalize(cleanQuestion))) {
      showToast('error', 'This FAQ already exists on the service.')
      return
    }

    setCreating(true)
    const { error } = await sb.from('ls_faqs').insert({
      location_service_id: locationServiceId,
      question: cleanQuestion,
      answer: cleanAnswer,
      sort_order: existing.length + 1,
    })
    setCreating(false)

    if (error) {
      showToast('error', error.message)
      return
    }
    setQuestion('')
    setAnswer('')
    setShowCustom(false)
    showToast('success', 'Service-specific FAQ created.')
    onRefresh()
  }

  return (
    <div className="admin-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-green-400" /> Add FAQs
          </h3>
          <p className="text-xs text-[#6b7280] mt-1">
            Choose reusable FAQs from the global library or create a service-specific FAQ.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLibrary} disabled={loading} className="admin-btn-secondary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button onClick={() => setShowCustom((value) => !value)} className="admin-btn-primary">
            <Plus className="w-4 h-4" /> Specific FAQ
          </button>
        </div>
      </div>

      {showCustom && (
        <div className="rounded-xl border border-dashed border-[#3a3d4e] bg-[#11131c] p-4 space-y-3">
          <div>
            <label className="admin-label">Question *</label>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} className="admin-textarea" />
          </div>
          <div>
            <label className="admin-label">Answer *</label>
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={4} className="admin-textarea" />
          </div>
          <div className="flex gap-2">
            <button onClick={createSpecificFaq} disabled={creating} className="admin-btn-primary">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create FAQ
            </button>
            <button onClick={() => setShowCustom(false)} className="admin-btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search global FAQs…"
            className="admin-input pl-9"
          />
        </div>
        <select value={scope} onChange={(event) => setScope(event.target.value as FaqScope)} className="admin-input md:w-52">
          <option value="recommended">Recommended</option>
          <option value="all">All active FAQs</option>
          <option value="global">Global only</option>
          <option value="service">Matching service</option>
          <option value="area">Matching city/area</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#6b7280] italic py-3">No matching FAQs found.</p>
      ) : (
        <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((faq) => {
            const faqId = s(faq.id)
            const faqQuestion = s(faq.question || faq.q)
            const alreadyAdded = existingQuestions.has(normalize(faqQuestion))
            return (
              <div key={faqId} className="rounded-xl border border-[#2a2d3e] bg-[#11131c] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{faqQuestion}</p>
                    <p className="text-sm text-[#94a3b8] line-clamp-3 mt-1">{s(faq.answer || faq.a)}</p>
                    <p className="text-xs text-[#6b7280] mt-2">
                      {[s(faq.faq_type || faq.category, 'General'), s(faq.service_slug), s(faq.area_slug)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => addFaq(faq)}
                    disabled={alreadyAdded || savingId === faqId}
                    className={alreadyAdded ? 'admin-btn-secondary flex-shrink-0 opacity-60' : 'admin-btn-primary flex-shrink-0'}
                  >
                    {savingId === faqId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : alreadyAdded ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {alreadyAdded ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function RelatedServicePicker({
  locationServiceId,
  citySlug,
  areaSlug,
  currentServiceSlug,
  isCityLevel,
  existing,
  onRefresh,
}: {
  locationServiceId: string
  citySlug: string
  areaSlug: string
  currentServiceSlug: string
  isCityLevel: boolean
  existing: Row[]
  onRefresh: () => void
}) {
  const sb = getBrowserClient()
  const [services, setServices] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const loadServices = async () => {
    setLoading(true)

    let request = sb
      .from('location_services')
      .select('id, service_slug, service_name, service_category, city_slug, area_slug, is_city_level, is_active')
      .eq('city_slug', citySlug)
      .eq('is_active', true)
      .eq('is_city_level', isCityLevel)
      .order('service_category')
      .order('service_name')

    if (!isCityLevel) request = request.eq('area_slug', areaSlug)

    const { data, error } = await request
    setLoading(false)

    if (error) {
      showToast('error', error.message)
      setServices([])
      return
    }

    setServices((data ?? []) as Row[])
  }

  useEffect(() => {
    loadServices()
  }, [citySlug, areaSlug, isCityLevel])

  const existingSlugs = useMemo(
    () => new Set(existing.map((row) => normalize(row.slug)).filter(Boolean)),
    [existing],
  )

  const categories = useMemo(() => {
    const values = new Set<string>()
    services.forEach((service) => {
      const value = s(service.service_category).trim()
      if (value) values.add(value)
    })
    return Array.from(values).sort((a, z) => a.localeCompare(z))
  }, [services])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return services.filter((service) => {
      const slug = s(service.service_slug)
      if (!slug || slug === currentServiceSlug) return false
      const serviceCategory = s(service.service_category)
      if (category !== 'all' && serviceCategory !== category) return false
      if (!term) return true
      return [
        s(service.service_name),
        slug,
        serviceCategory,
      ].join(' ').toLowerCase().includes(term)
    })
  }, [services, query, category, currentServiceSlug])

  const addRelated = async (service: Row) => {
    const relatedLocationServiceId = s(service.id)
    const slug = s(service.service_slug).trim()
    if (!relatedLocationServiceId || !slug) return
    if (existingSlugs.has(normalize(slug))) {
      showToast('error', 'This service is already related.')
      return
    }

    setSavingId(relatedLocationServiceId)
    const { error } = await sb.from('ls_related_services').insert({
      location_service_id: locationServiceId,
      related_location_service_id: relatedLocationServiceId,
      name: s(service.service_name, slug),
      slug,
      category: s(service.service_category) || null,
      sort_order: existing.length + 1,
    })
    setSavingId(null)

    if (error) {
      showToast('error', error.message)
      return
    }
    showToast('success', 'Related service added.')
    onRefresh()
  }

  return (
    <div className="admin-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Link2 className="w-4 h-4 text-orange-400" /> Choose Existing Service
          </h3>
          <p className="text-xs text-[#6b7280] mt-1">
            Showing active services from the same {isCityLevel ? `${citySlug} city-level route` : `${areaSlug}, ${citySlug} area`}.
          </p>
        </div>
        <button onClick={loadServices} disabled={loading} className="admin-btn-secondary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search existing service name or slug…"
            className="admin-input pl-9"
          />
        </div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="admin-input md:w-52">
          <option value="all">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[#6b7280] italic py-3">No matching active services were found in this route scope.</p>
      ) : (
        <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
          {filtered.map((service) => {
            const relatedLocationServiceId = s(service.id)
            const slug = s(service.service_slug)
            const alreadyAdded = existingSlugs.has(normalize(slug))
            const serviceCategory = s(service.service_category, 'uncategorized')
            return (
              <div key={relatedLocationServiceId} className="flex items-center justify-between gap-4 rounded-xl border border-[#2a2d3e] bg-[#11131c] p-4">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">
                    {s(service.service_name, slug)}
                  </p>
                  <p className="text-xs text-[#6b7280] mt-1">
                    {slug} · {serviceCategory}
                  </p>
                </div>
                <button
                  onClick={() => addRelated(service)}
                  disabled={alreadyAdded || savingId === relatedLocationServiceId}
                  className={alreadyAdded ? 'admin-btn-secondary flex-shrink-0 opacity-60' : 'admin-btn-primary flex-shrink-0'}
                >
                  {savingId === relatedLocationServiceId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : alreadyAdded ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {alreadyAdded ? 'Added' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
